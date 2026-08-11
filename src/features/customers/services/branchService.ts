import { v4 as uuidv4 } from 'uuid';
import { branchLocalRepository } from '@/shared/lib/indexeddb/repositories/branchRepository';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { outboxProcessor } from '@/shared/lib/sync/OutboxProcessor';
import type { CustomerBranch } from '@/shared/types/customer.types';
import type { BranchFormValues } from '@/shared/types/customer.schema';

class BranchService {
  async listByCustomer(customerId: string): Promise<CustomerBranch[]> {
    return branchLocalRepository.findByCustomerIdSorted(customerId);
  }

  async getById(id: string): Promise<CustomerBranch | undefined> {
    const branch = await branchLocalRepository.getById(id);
    if (branch?.isDeleted) return undefined;
    return branch;
  }

  async create(
    customerId: string,
    data: BranchFormValues,
    userId: string,
  ): Promise<CustomerBranch> {
    const customer = await customerLocalRepository.getById(customerId);
    if (!customer || customer.isDeleted) {
      throw new Error('Müşteri bulunamadı.');
    }

    const now = new Date().toISOString();
    const branch: CustomerBranch = {
      id: uuidv4(),
      customerId,
      name: data.name.trim(),
      address: data.address || undefined,
      phone: data.phone || undefined,
      contactPerson: data.contactPerson || undefined,
      isActive: data.isActive,
      isDeleted: false,
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      version: 1,
    };

    await branchLocalRepository.save(branch);
    await outboxProcessor.enqueue({
      entityType: 'branch',
      entityId: branch.id,
      operation: 'create',
      data: { branchId: branch.id, customerId },
    });
    return branch;
  }

  async update(
    id: string,
    data: BranchFormValues,
    userId: string,
  ): Promise<CustomerBranch> {
    const existing = await branchLocalRepository.getById(id);
    if (!existing || existing.isDeleted) {
      throw new Error('Şube bulunamadı.');
    }

    const branch: CustomerBranch = {
      ...existing,
      name: data.name.trim(),
      address: data.address || undefined,
      phone: data.phone || undefined,
      contactPerson: data.contactPerson || undefined,
      isActive: data.isActive,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      version: existing.version + 1,
      syncStatus: 'pending',
    };

    await branchLocalRepository.save(branch);
    await outboxProcessor.enqueue({
      entityType: 'branch',
      entityId: branch.id,
      operation: 'update',
      data: { branchId: branch.id, customerId: branch.customerId },
    });
    return branch;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const existing = await branchLocalRepository.getById(id);
    if (!existing || existing.isDeleted) {
      throw new Error('Şube bulunamadı.');
    }

    const branch: CustomerBranch = {
      ...existing,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      version: existing.version + 1,
      syncStatus: 'pending',
    };

    await branchLocalRepository.save(branch);
    await outboxProcessor.enqueue({
      entityType: 'branch',
      entityId: branch.id,
      operation: 'delete',
      data: { branchId: branch.id, customerId: branch.customerId },
    });
  }

  toFormValues(branch: CustomerBranch): BranchFormValues {
    return {
      name: branch.name,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      contactPerson: branch.contactPerson ?? '',
      isActive: branch.isActive,
    };
  }
}

export const branchService = new BranchService();
