import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '@/shared/types/role.types';
import {
  customerLocalRepository,
  filterCustomers,
  type CustomerActiveFilter,
} from '@/shared/lib/indexeddb/repositories/customerRepository';
import { outboxProcessor } from '@/shared/lib/sync/OutboxProcessor';
import { syncService } from '@/features/sync/services/syncService';
import type {
  Customer,
  CustomerFormData,
  CustomerSource,
} from '@/shared/types/customer.types';
import type { CustomerFormValues } from '@/shared/types/customer.schema';

class CustomerService {
  async list(
    userId: string,
    role: UserRole,
    options: {
      search?: string;
      activeFilter?: CustomerActiveFilter;
    } = {},
  ): Promise<Customer[]> {
    const all =
      role === UserRole.ADMIN
        ? await customerLocalRepository.getAll()
        : await customerLocalRepository.findBySalesRepId(userId);
    return filterCustomers(all, options);
  }

  async getById(id: string): Promise<Customer | undefined> {
    const customer = await customerLocalRepository.getById(id);
    if (customer?.isDeleted) return undefined;
    return customer;
  }

  async create(
    data: CustomerFormValues,
    salesRepId: string,
    userId: string,
    source: CustomerSource = 'manual',
  ): Promise<Customer> {
    const existing = await customerLocalRepository.findByCode(data.code);
    if (existing) {
      throw new Error(`Bu cari kodu zaten kullanılıyor: ${data.code}`);
    }

    const customer = this.buildCustomer(data, {
      id: uuidv4(),
      localId: uuidv4(),
      salesRepId,
      source,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      version: 1,
      isDeleted: false,
    });

    await customerLocalRepository.save(customer);
    await this.enqueueSync(customer, 'create');
    return customer;
  }

  async update(
    id: string,
    data: CustomerFormValues,
    userId: string,
  ): Promise<Customer> {
    const existing = await customerLocalRepository.getById(id);
    if (!existing || existing.isDeleted) {
      throw new Error('Müşteri bulunamadı.');
    }

    const duplicate = await customerLocalRepository.findByCode(data.code);
    if (duplicate && duplicate.id !== id) {
      throw new Error(`Bu cari kodu zaten kullanılıyor: ${data.code}`);
    }

    const customer = this.buildCustomer(data, {
      ...existing,
      updatedBy: userId,
      version: existing.version + 1,
    });

    await customerLocalRepository.save(customer);
    await this.enqueueSync(customer, 'update');
    return customer;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const existing = await customerLocalRepository.getById(id);
    if (!existing || existing.isDeleted) {
      throw new Error('Müşteri bulunamadı.');
    }

    const now = new Date().toISOString();
    const customer: Customer = {
      ...existing,
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      updatedBy: userId,
      version: existing.version + 1,
      syncStatus: 'pending',
    };

    await customerLocalRepository.save(customer);
    await this.enqueueSync(customer, 'delete');
  }

  async importFromExcel(
    data: CustomerFormData,
    salesRepId: string,
    userId: string,
  ): Promise<Customer> {
    return this.create(
      {
        code: data.code,
        name: data.name,
        taxNumber: data.taxNumber ?? '',
        contactPerson: data.contactPerson ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        city: data.city ?? '',
        district: data.district ?? '',
        fullAddress: data.fullAddress ?? '',
        isActive: data.isActive,
      },
      salesRepId,
      userId,
      'excel',
    );
  }

  toFormValues(customer: Customer): CustomerFormValues {
    return {
      code: customer.code,
      name: customer.name,
      taxNumber: customer.taxNumber ?? '',
      contactPerson: customer.contactPerson ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      city: customer.address?.city ?? '',
      district: customer.address?.district ?? '',
      fullAddress: customer.address?.fullAddress ?? '',
      isActive: customer.isActive,
    };
  }

  private buildCustomer(
    data: CustomerFormValues,
    base: Partial<Customer> & Pick<Customer, 'id' | 'salesRepId'>,
  ): Customer {
    const now = new Date().toISOString();
    return {
      id: base.id,
      localId: base.localId ?? base.id,
      salesRepId: base.salesRepId,
      source: base.source ?? 'manual',
      createdAt: base.createdAt ?? now,
      updatedAt: now,
      createdBy: base.createdBy ?? base.updatedBy ?? '',
      updatedBy: base.updatedBy ?? base.createdBy ?? '',
      version: base.version ?? 1,
      syncStatus: 'pending',
      isDeleted: base.isDeleted ?? false,
      deletedAt: base.deletedAt,
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      taxNumber: data.taxNumber || undefined,
      contactPerson: data.contactPerson || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      isActive: data.isActive,
      address:
        data.city || data.district || data.fullAddress
          ? {
              city: data.city || undefined,
              district: data.district || undefined,
              fullAddress: data.fullAddress || undefined,
            }
          : undefined,
      erpId: base.erpId,
      erpSyncStatus: base.erpSyncStatus,
      priceListId: base.priceListId,
      creditLimit: base.creditLimit,
    };
  }

  private async enqueueSync(
    customer: Customer,
    operation: 'create' | 'update' | 'delete',
  ): Promise<void> {
    await outboxProcessor.enqueue({
      entityType: 'customer',
      entityId: customer.id,
      operation,
      data: { customerId: customer.id, localId: customer.localId },
    });
    await syncService.refreshPendingCount();
  }
}

export const customerService = new CustomerService();
