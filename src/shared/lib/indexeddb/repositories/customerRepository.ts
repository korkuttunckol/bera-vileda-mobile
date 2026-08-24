import { db, type LocalCustomer } from '../db';
import { BaseRepository } from './baseRepository';
import type { SyncStatus } from '@/shared/types/base.types';
import { normalizeSearchText } from '@/shared/utils/normalizeSearchText';

export type CustomerActiveFilter = 'all' | 'active' | 'passive';

class CustomerLocalRepository extends BaseRepository<LocalCustomer> {
  protected tableName = 'customers';

  async getById(id: string): Promise<LocalCustomer | undefined> {
    return db.customers.get(id);
  }

  async getAll(): Promise<LocalCustomer[]> {
    return db.customers.toArray();
  }

  async save(entity: LocalCustomer): Promise<void> {
    await db.customers.put(entity);
  }

  async saveMany(entities: LocalCustomer[]): Promise<void> {
    await db.customers.bulkPut(entities);
  }

  delete(_id: string): Promise<void> {
    return Promise.reject(new Error('Fiziksel silme yasaktır. softDelete kullanın.'));
  }

  async findBySyncStatus(status: SyncStatus): Promise<LocalCustomer[]> {
    return db.customers.where('syncStatus').equals(status).toArray();
  }

  async findBySalesRepId(salesRepId: string): Promise<LocalCustomer[]> {
    return db.customers
      .where('salesRepId')
      .equals(salesRepId)
      .filter((c) => !c.isDeleted)
      .toArray();
  }

  async findByCode(code: string): Promise<LocalCustomer | undefined> {
    return db.customers
      .where('code')
      .equals(code)
      .filter((c) => !c.isDeleted)
      .first();
  }

  async findByCodeExact(code: string): Promise<LocalCustomer | undefined> {
    return db.customers.where('code').equals(code).first();
  }

  async findAllIncludingDeleted(): Promise<LocalCustomer[]> {
    return db.customers.toArray();
  }
}

export const customerLocalRepository = new CustomerLocalRepository();

function isInBeraPortfolio(customer: LocalCustomer): boolean {
  // Manual/Excel records are local records; Logo cards are restricted to the
  // current rollout portfolio. Missing SPECODE5 means an old Logo card and
  // stays hidden until the next Logo customer sync refreshes it.
  if (customer.source !== 'logo') return true;
  return (customer.logoSpecialCode5 ?? '').trim().toLocaleUpperCase('tr-TR') === 'BERA';
}

export function filterCustomers(
  customers: LocalCustomer[],
  options: {
    search?: string;
    activeFilter?: CustomerActiveFilter;
    includeDeleted?: boolean;
    /** Only Logo CLCARD.SPECODE values assigned to the signed-in sales rep. */
    logoSalesRepCodes?: readonly string[];
  },
): LocalCustomer[] {
  let result = customers;

  if (!options.includeDeleted) {
    result = result.filter((c) => !c.isDeleted);
  }

  result = result.filter(isInBeraPortfolio);

  if (options.logoSalesRepCodes !== undefined) {
    const allowedCodes = new Set(
      options.logoSalesRepCodes
        .map((code) => String(code ?? '').trim().toLocaleUpperCase('tr-TR'))
        .filter(Boolean),
    );
    result = result.filter((customer) =>
      allowedCodes.has(
        String(customer.logoSalesRepCode ?? '')
          .trim()
          .toLocaleUpperCase('tr-TR'),
      ),
    );
  }

  if (options.activeFilter === 'active') {
    result = result.filter((c) => c.isActive);
  } else if (options.activeFilter === 'passive') {
    result = result.filter((c) => !c.isActive);
  }

  if (options.search?.trim()) {
    const term = normalizeSearchText(options.search);
    if (term) {
      result = result.filter((c) => {
        const code = normalizeSearchText(c.code);
        const name = normalizeSearchText(c.name);
        return code.includes(term) || name.includes(term);
      });
    }
  }

  return result.sort((a, b) =>
    String(a.code ?? '').localeCompare(String(b.code ?? ''), 'tr-TR', {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}
