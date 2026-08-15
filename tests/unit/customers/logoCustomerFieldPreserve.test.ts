import { describe, expect, it } from 'vitest';
import { customerService } from '@/features/customers/services/customerService';
import type { Customer } from '@/shared/types/customer.types';

describe('customerService Logo field preservation', () => {
  it('keeps logoSalesRepCode and specialCode2 on update (buildCustomer)', async () => {
    const existing: Customer = {
      id: 'c1',
      localId: 'c1',
      code: '120.01',
      name: 'Logo Cari',
      salesRepId: '',
      source: 'logo',
      isActive: true,
      isDeleted: false,
      createdAt: 't0',
      updatedAt: 't0',
      createdBy: 'logo-customer-sync',
      updatedBy: 'logo-customer-sync',
      version: 1,
      syncStatus: 'pending',
      erpId: '55',
      logoSalesRepCode: '2217',
      specialCode2: 'SC2',
      address: { city: 'İstanbul', district: 'Kadıköy' },
    };

    // Inject into private path via update after mocking getById — exercise buildCustomer
    // through the public update API with a stubbed repository would be heavier;
    // call the private builder indirectly by spying save. Prefer direct cast for unit focus:
    const built = (
      customerService as unknown as {
        buildCustomer: (
          data: {
            code: string;
            name: string;
            taxNumber: string;
            contactPerson: string;
            phone: string;
            email: string;
            city: string;
            district: string;
            fullAddress: string;
            isActive: boolean;
          },
          base: Partial<Customer> & Pick<Customer, 'id' | 'salesRepId'>,
        ) => Customer;
      }
    ).buildCustomer(
      {
        code: '120.01',
        name: 'Logo Cari Güncel',
        taxNumber: '',
        contactPerson: '',
        phone: '',
        email: '',
        city: 'İstanbul',
        district: 'Kadıköy',
        fullAddress: '',
        isActive: true,
      },
      {
        id: existing.id,
        localId: existing.localId,
        salesRepId: existing.salesRepId,
        source: existing.source,
        createdAt: existing.createdAt,
        createdBy: existing.createdBy,
        updatedBy: 'admin',
        version: existing.version,
        erpId: existing.erpId,
        logoSalesRepCode: existing.logoSalesRepCode,
        specialCode2: existing.specialCode2,
      },
    );

    expect(built.erpId).toBe('55');
    expect(built.logoSalesRepCode).toBe('2217');
    expect(built.specialCode2).toBe('SC2');
    expect(built.source).toBe('logo');
    expect(built.salesRepId).toBe('');
    expect(built.name).toBe('Logo Cari Güncel');
  });
});
