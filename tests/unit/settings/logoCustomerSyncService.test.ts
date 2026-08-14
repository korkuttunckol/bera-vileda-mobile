import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalCustomer } from '@/shared/lib/indexeddb/db';
import type { CustomerBranch } from '@/shared/types/customer.types';
import type { Order, OrderLine } from '@/shared/types/order.types';

const customersStore = new Map<string, LocalCustomer>();
const branchesStore = new Map<string, CustomerBranch>();
const ordersStore = new Map<string, Order>();
const orderLinesStore = new Map<string, OrderLine>();
const metaStore = new Map<string, string>();

const fetchLogoCustomerRowsMock = vi.fn();

vi.mock('@/config/env', () => ({
  isLogoCustomersApiConfigured: () => true,
  env: { VITE_LOGO_CUSTOMERS_API_URL: 'http://logo.test/cariler' },
}));

vi.mock('@/shared/lib/indexeddb/db', () => ({
  META_KEYS: {
    LAST_LOGO_CUSTOMER_SYNC_AT: 'lastLogoCustomerSyncAt',
  },
  getMetaValue: async (key: string) => metaStore.get(key),
  setMetaValue: async (key: string, value: string) => {
    metaStore.set(key, value);
  },
}));

vi.mock('@/shared/lib/indexeddb/repositories/customerRepository', () => ({
  customerLocalRepository: {
    getAll: async () => Array.from(customersStore.values()),
    saveMany: async (entities: LocalCustomer[]) => {
      for (const e of entities) customersStore.set(e.id, e);
    },
  },
}));

vi.mock('@/features/settings/services/logoCustomerApiClient', () => {
  class LogoCustomerApiError extends Error {
    statusCode?: number;
    constructor(message: string, statusCode?: number) {
      super(message);
      this.name = 'LogoCustomerApiError';
      this.statusCode = statusCode;
    }
  }
  return {
    LogoCustomerApiError,
    fetchLogoCustomerRows: (...args: unknown[]) =>
      fetchLogoCustomerRowsMock(...args),
  };
});

function seedCustomer(
  partial: Partial<LocalCustomer> & Pick<LocalCustomer, 'id' | 'code'>,
): LocalCustomer {
  const c: LocalCustomer = {
    localId: partial.id,
    name: partial.name ?? 'Local',
    salesRepId: partial.salesRepId ?? 'bera-uid',
    isActive: true,
    isDeleted: false,
    source: 'excel',
    createdAt: 't0',
    updatedAt: 't0',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'synced',
    ...partial,
  };
  customersStore.set(c.id, c);
  return c;
}

async function loadService() {
  const mod = await import(
    '@/features/settings/services/logoCustomerSyncService'
  );
  return mod.logoCustomerSyncService;
}

describe('logoCustomerSyncService', () => {
  beforeEach(() => {
    customersStore.clear();
    branchesStore.clear();
    ordersStore.clear();
    orderLinesStore.clear();
    metaStore.clear();
    fetchLogoCustomerRowsMock.mockReset();

    branchesStore.set('b1', {
      id: 'b1',
      customerId: 'c1',
      name: 'Merkez Şube',
      isActive: true,
      isDeleted: false,
      syncStatus: 'synced',
      createdAt: 't0',
      updatedAt: 't0',
      createdBy: 'u',
      updatedBy: 'u',
      version: 1,
    });

    ordersStore.set(
      'o1',
      {
        id: 'o1',
        localId: 'o1',
        customerId: 'c1',
        customerName: 'C',
        branchId: 'b1',
        salesRepId: 'bera-uid',
        status: 'draft',
        syncStatus: 'pending',
        orderSyncStatus: 'pending_offline',
        isDeleted: false,
        createdAt: 't0',
        updatedAt: 't0',
        createdBy: 'u',
        updatedBy: 'u',
        version: 1,
        orderDate: 't0',
        subtotal: 10,
        discountTotal: 0,
        vatTotal: 2,
        grandTotal: 12,
        lineCount: 1,
        createdOffline: true,
        erpSyncStatus: 'none',
      } satisfies Order,
    );

    orderLinesStore.set(
      'ol1',
      {
        id: 'ol1',
        orderId: 'o1',
        productId: 'p1',
        productSku: 'SKU1',
        productName: 'P',
        quantity: 1,
        unitPrice: 10,
        discountRate: 0,
        vatRate: 20,
        lineTotal: 10,
        sortOrder: 0,
      } satisfies OrderLine,
    );
  });

  it('creates a new customer from Logo row', async () => {
    const logoCustomerSyncService = await loadService();

    const report = await logoCustomerSyncService.applyRows([
      {
        LOGICALREF: '500',
        CODE: 'NEW-1',
        DEFINITION_: 'Yeni Cari',
        SPECODE: '2217',
        SPECODE2: 'Z2',
        CITY: 'İzmir',
        TOWN: 'Bornova',
      },
    ]);

    expect(report.success).toBe(true);
    expect(report.created).toBe(1);
    expect(report.updated).toBe(0);

    const all = Array.from(customersStore.values());
    expect(all).toHaveLength(1);
    expect(all[0].erpId).toBe('500');
    expect(all[0].code).toBe('NEW-1');
    expect(all[0].name).toBe('Yeni Cari');
    expect(all[0].logoSalesRepCode).toBe('2217');
    expect(all[0].specialCode2).toBe('Z2');
    expect(all[0].salesRepId).toBe('');
    expect(all[0].address?.city).toBe('İzmir');
    expect(all[0].address?.district).toBe('Bornova');
    expect(all[0].source).toBe('logo');
  });

  it('updates customer matched by erpId', async () => {
    seedCustomer({
      id: 'c1',
      code: 'OLD',
      erpId: '500',
      name: 'Eski',
      salesRepId: 'bera-uid',
      logoSalesRepCode: '1111',
    });

    const logoCustomerSyncService = await loadService();

    const report = await logoCustomerSyncService.applyRows([
      {
        LOGICALREF: '500',
        CODE: 'NEWCODE',
        DEFINITION_: 'Güncel Ad',
        SPECODE: '2217',
        CITY: 'Bursa',
        TOWN: 'Nilüfer',
      },
    ]);

    expect(report.success).toBe(true);
    expect(report.updated).toBe(1);
    expect(report.created).toBe(0);

    const c = customersStore.get('c1')!;
    expect(c.code).toBe('NEWCODE');
    expect(c.name).toBe('Güncel Ad');
    expect(c.logoSalesRepCode).toBe('2217');
    expect(c.salesRepId).toBe('bera-uid');
    expect(c.address?.city).toBe('Bursa');
    expect(c.address?.district).toBe('Nilüfer');
  });

  it('updates via code fallback when erpId absent locally', async () => {
    seedCustomer({ id: 'c1', code: 'C90', erpId: undefined, name: 'Eski' });

    const logoCustomerSyncService = await loadService();

    const report = await logoCustomerSyncService.applyRows([
      {
        LOGICALREF: '777',
        CODE: 'C90',
        DEFINITION_: 'Fallback Ad',
        SPECODE: '2217',
      },
    ]);

    expect(report.success).toBe(true);
    expect(report.updated).toBe(1);
    const c = customersStore.get('c1')!;
    expect(c.erpId).toBe('777');
    expect(c.name).toBe('Fallback Ad');
    expect(c.logoSalesRepCode).toBe('2217');
    expect(c.salesRepId).toBe('bera-uid');
  });

  it('reports duplicate code conflict without overwriting either row', async () => {
    seedCustomer({ id: 'a', code: 'DUP', erpId: undefined, name: 'A' });
    seedCustomer({ id: 'b', code: 'DUP', erpId: undefined, name: 'B' });

    const logoCustomerSyncService = await loadService();

    const report = await logoCustomerSyncService.applyRows([
      { LOGICALREF: '1', CODE: 'DUP', DEFINITION_: 'Logo' },
    ]);

    expect(report.success).toBe(true);
    expect(report.updated).toBe(0);
    expect(report.created).toBe(0);
    expect(report.conflicts[0]?.type).toBe('duplicate_local_code');
    expect(customersStore.get('a')?.name).toBe('A');
    expect(customersStore.get('b')?.name).toBe('B');
  });

  it('preserves local customers on empty / invalid rows input', async () => {
    seedCustomer({ id: 'c1', code: 'KEEP', name: 'Keep Me', erpId: '1' });

    const logoCustomerSyncService = await loadService();

    const empty = await logoCustomerSyncService.applyRows([]);
    expect(empty.success).toBe(false);
    expect(empty.localDataPreserved).toBe(true);
    expect(customersStore.get('c1')?.name).toBe('Keep Me');
    expect(metaStore.has('lastLogoCustomerSyncAt')).toBe(false);

    const invalid = await logoCustomerSyncService.applyRows(
      null as unknown as [],
    );
    expect(invalid.success).toBe(false);
    expect(customersStore.get('c1')?.name).toBe('Keep Me');
  });

  it('does not mutate CustomerBranch, Order, or OrderLine stores', async () => {
    seedCustomer({ id: 'c1', code: 'C1', erpId: '10', name: 'C' });

    const branchBefore = structuredClone(branchesStore.get('b1')!);
    const orderBefore = structuredClone(ordersStore.get('o1')!);
    const lineBefore = structuredClone(orderLinesStore.get('ol1')!);

    const logoCustomerSyncService = await loadService();

    await logoCustomerSyncService.applyRows([
      {
        LOGICALREF: '10',
        CODE: 'C1',
        DEFINITION_: 'Updated',
        SPECODE: '2217',
      },
    ]);

    expect(branchesStore.get('b1')).toEqual(branchBefore);
    expect(ordersStore.get('o1')).toEqual(orderBefore);
    expect(orderLinesStore.get('ol1')).toEqual(lineBefore);
  });

  it('writes lastLogoCustomerSyncAt only on successful sync', async () => {
    const logoCustomerSyncService = await loadService();

    const fail = await logoCustomerSyncService.applyRows([]);
    expect(fail.success).toBe(false);
    expect(metaStore.has('lastLogoCustomerSyncAt')).toBe(false);

    const ok = await logoCustomerSyncService.applyRows([
      { LOGICALREF: '1', CODE: 'A', DEFINITION_: 'Ok' },
    ]);
    expect(ok.success).toBe(true);
    expect(metaStore.get('lastLogoCustomerSyncAt')).toBeTruthy();
    expect(metaStore.get('lastLogoCustomerSyncAt')).toBe(ok.startedAt);
  });

  it('preserves local data when API fetch fails', async () => {
    seedCustomer({ id: 'c1', code: 'KEEP', name: 'Local Keep', erpId: '9' });

    const { LogoCustomerApiError } = await import(
      '@/features/settings/services/logoCustomerApiClient'
    );
    fetchLogoCustomerRowsMock.mockRejectedValue(
      new LogoCustomerApiError(
        'Logo cari API hata döndürdü (HTTP 500). Yerel veriler korunur.',
        500,
      ),
    );

    const logoCustomerSyncService = await loadService();
    const report = await logoCustomerSyncService.syncToIndexedDB();

    expect(report.success).toBe(false);
    expect(report.localDataPreserved).toBe(true);
    expect(customersStore.get('c1')?.name).toBe('Local Keep');
    expect(metaStore.has('lastLogoCustomerSyncAt')).toBe(false);
  });

  it('preserves local data when API returns empty (client throws)', async () => {
    seedCustomer({ id: 'c1', code: 'KEEP', name: 'Local Keep', erpId: '9' });

    const { LogoCustomerApiError } = await import(
      '@/features/settings/services/logoCustomerApiClient'
    );
    fetchLogoCustomerRowsMock.mockRejectedValue(
      new LogoCustomerApiError(
        'Logo cari API boş dizi döndürdü. Yerel cariler korunur (pasifleştirme/silme yok).',
      ),
    );

    const logoCustomerSyncService = await loadService();
    const report = await logoCustomerSyncService.syncToIndexedDB();

    expect(report.success).toBe(false);
    expect(report.localDataPreserved).toBe(true);
    expect(customersStore.get('c1')?.name).toBe('Local Keep');
    expect(metaStore.has('lastLogoCustomerSyncAt')).toBe(false);
  });
});
