import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalProduct } from '@/shared/lib/indexeddb/db';
import type { CustomerBranch } from '@/shared/types/customer.types';
import type { Order, OrderLine } from '@/shared/types/order.types';

const productsStore = new Map<string, LocalProduct>();
const branchesStore = new Map<string, CustomerBranch>();
const ordersStore = new Map<string, Order>();
const orderLinesStore = new Map<string, OrderLine>();
const metaStore = new Map<string, string>();

const fetchLogoStockRowsMock = vi.fn();

vi.mock('@/config/env', () => ({
  isLogoApiConfigured: () => true,
  env: { VITE_LOGO_API_URL: 'http://logo.test/stoklar' },
}));

vi.mock('@/shared/lib/indexeddb/db', () => ({
  META_KEYS: {
    LAST_LOGO_PRODUCT_SYNC_AT: 'lastLogoProductSyncAt',
  },
  getMetaValue: async (key: string) => metaStore.get(key),
  setMetaValue: async (key: string, value: string) => {
    metaStore.set(key, value);
  },
}));

vi.mock('@/shared/lib/indexeddb/repositories/productRepository', () => ({
  productLocalRepository: {
    getAll: async () => Array.from(productsStore.values()),
    saveMany: async (entities: LocalProduct[]) => {
      for (const e of entities) productsStore.set(e.id, e);
    },
  },
}));

vi.mock('@/features/settings/services/logoApiClient', () => {
  class LogoApiError extends Error {
    statusCode?: number;
    constructor(message: string, statusCode?: number) {
      super(message);
      this.name = 'LogoApiError';
      this.statusCode = statusCode;
    }
  }
  return {
    LogoApiError,
    fetchLogoStockRows: (...args: unknown[]) => fetchLogoStockRowsMock(...args),
  };
});

function seedProduct(
  partial: Partial<LocalProduct> &
    Pick<LocalProduct, 'id' | 'sku' | 'barcode'>,
): LocalProduct {
  const p: LocalProduct = {
    localId: partial.id,
    name: partial.name ?? 'Local',
    category: 'Genel',
    unit: 'Adet',
    listPrice: 1,
    vatRate: 20,
    stockQuantity: 0,
    isActive: true,
    isDeleted: false,
    createdAt: 't0',
    updatedAt: 't0',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'synced',
    ...partial,
  };
  productsStore.set(p.id, p);
  return p;
}

async function loadService() {
  const mod = await import(
    '@/features/settings/services/logoProductSyncService'
  );
  return mod.logoProductSyncService;
}

describe('logoProductSyncService', () => {
  beforeEach(() => {
    productsStore.clear();
    branchesStore.clear();
    ordersStore.clear();
    orderLinesStore.clear();
    metaStore.clear();
    fetchLogoStockRowsMock.mockReset();

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

  it('creates a new product with LOGICALREF as erpId', async () => {
    const svc = await loadService();
    const report = await svc.applyRows([
      {
        LOGICALREF: '500',
        CODE: '8691',
        PRODUCERCODE: 'NEW-1',
        NAME: 'Yeni Ürün',
        MERKEZ: 12,
        SATIS_FIYATI: 10,
        VAT: 20,
      },
    ]);

    expect(report.success).toBe(true);
    expect(report.created).toBe(1);
    const all = Array.from(productsStore.values());
    expect(all).toHaveLength(1);
    expect(all[0].erpId).toBe('500');
    expect(all[0].barcode).toBe('8691');
    expect(all[0].sku).toBe('NEW-1');
    expect(all[0].stockQuantity).toBe(12);
  });

  it('updates product matched by erpId and keeps LOGICALREF', async () => {
    seedProduct({
      id: 'p1',
      sku: 'OLD',
      barcode: 'OLD-BC',
      erpId: '500',
      name: 'Eski',
      stockQuantity: 1,
    });

    const svc = await loadService();
    const report = await svc.applyRows([
      {
        LOGICALREF: '500',
        CODE: 'NEW-BC',
        PRODUCERCODE: 'NEW-SKU',
        NAME: 'Güncel',
        MERKEZ: 44,
        SATIS_FIYATI: 9,
      },
    ]);

    expect(report.success).toBe(true);
    expect(report.updated).toBe(1);
    const p = productsStore.get('p1')!;
    expect(p.erpId).toBe('500');
    expect(p.barcode).toBe('NEW-BC');
    expect(p.sku).toBe('NEW-SKU');
    expect(p.stockQuantity).toBe(44);
  });

  it('preserves local products on empty / invalid rows', async () => {
    seedProduct({ id: 'p1', sku: 'KEEP', barcode: 'K1', name: 'Keep Me' });

    const svc = await loadService();
    const empty = await svc.applyRows([]);
    expect(empty.success).toBe(false);
    expect(empty.localDataPreserved).toBe(true);
    expect(productsStore.get('p1')?.name).toBe('Keep Me');
    expect(metaStore.has('lastLogoProductSyncAt')).toBe(false);

    const invalid = await svc.applyRows(null as unknown as []);
    expect(invalid.success).toBe(false);
    expect(productsStore.get('p1')?.name).toBe('Keep Me');
  });

  it('does not mutate CustomerBranch, Order, or OrderLine stores', async () => {
    seedProduct({ id: 'p1', sku: 'S1', barcode: 'B1', erpId: '10' });

    const branchBefore = structuredClone(branchesStore.get('b1')!);
    const orderBefore = structuredClone(ordersStore.get('o1')!);
    const lineBefore = structuredClone(orderLinesStore.get('ol1')!);

    const svc = await loadService();
    await svc.applyRows([
      {
        LOGICALREF: '10',
        CODE: 'B1',
        PRODUCERCODE: 'S1',
        NAME: 'Updated',
        MERKEZ: 3,
      },
    ]);

    expect(branchesStore.get('b1')).toEqual(branchBefore);
    expect(ordersStore.get('o1')).toEqual(orderBefore);
    expect(orderLinesStore.get('ol1')).toEqual(lineBefore);
  });

  it('writes lastLogoProductSyncAt only on successful sync', async () => {
    const svc = await loadService();

    const fail = await svc.applyRows([]);
    expect(fail.success).toBe(false);
    expect(metaStore.has('lastLogoProductSyncAt')).toBe(false);

    const ok = await svc.applyRows([
      {
        LOGICALREF: '1',
        CODE: 'A',
        PRODUCERCODE: 'S',
        NAME: 'Ok',
        MERKEZ: 1,
      },
    ]);
    expect(ok.success).toBe(true);
    expect(metaStore.get('lastLogoProductSyncAt')).toBe(ok.startedAt);
  });

  it('preserves local data when API fetch fails', async () => {
    seedProduct({ id: 'p1', sku: 'KEEP', barcode: 'K', name: 'Local Keep' });

    const { LogoApiError } = await import(
      '@/features/settings/services/logoApiClient'
    );
    fetchLogoStockRowsMock.mockRejectedValue(
      new LogoApiError(
        'Logo API hata döndürdü (HTTP 500). Yerel veriler korunur.',
        500,
      ),
    );

    const svc = await loadService();
    const report = await svc.syncToIndexedDB();
    expect(report.success).toBe(false);
    expect(report.localDataPreserved).toBe(true);
    expect(productsStore.get('p1')?.name).toBe('Local Keep');
    expect(metaStore.has('lastLogoProductSyncAt')).toBe(false);
  });
});
