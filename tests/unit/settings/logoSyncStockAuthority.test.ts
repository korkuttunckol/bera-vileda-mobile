import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalProduct } from '@/shared/lib/indexeddb/db';
import type { LogoStockRow } from '@/features/settings/services/logoApiClient';

const products = new Map<string, LocalProduct>();
const ordersTouched = vi.fn();

vi.mock('@/config/env', () => ({
  isLogoApiConfigured: () => true,
  env: {
    VITE_LOGO_API_URL: 'http://192.168.1.11/LogoApi/stoklar.ashx',
  },
}));

vi.mock('@/shared/lib/indexeddb/db', () => ({
  META_KEYS: { LAST_LOGO_PRODUCT_SYNC_AT: 'lastLogoProductSyncAt' },
  setMetaValue: vi.fn(async () => undefined),
}));

vi.mock('@/shared/lib/indexeddb/repositories/productRepository', () => ({
  productLocalRepository: {
    async getAll(): Promise<LocalProduct[]> {
      return [...products.values()];
    },
    async saveMany(rows: LocalProduct[]): Promise<void> {
      for (const row of rows) products.set(row.id, row);
    },
  },
}));

vi.mock('@/shared/lib/indexeddb/repositories/orderRepository', () => ({
  orderLocalRepository: {
    getAll: (...args: unknown[]) => {
      ordersTouched(...args);
      return [];
    },
    save: (...args: unknown[]) => {
      ordersTouched(...args);
    },
    saveMany: (...args: unknown[]) => {
      ordersTouched(...args);
    },
    saveWithLines: (...args: unknown[]) => {
      ordersTouched(...args);
    },
  },
}));

const fetchLogoStockRows = vi.fn();

vi.mock('@/features/settings/services/logoApiClient', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/settings/services/logoApiClient')
  >('@/features/settings/services/logoApiClient');
  return {
    ...actual,
    fetchLogoStockRows: (...args: unknown[]) => fetchLogoStockRows(...args),
  };
});

function seedProduct(overrides: Partial<LocalProduct> = {}): LocalProduct {
  const product: LocalProduct = {
    id: 'p1',
    localId: 'p1',
    sku: 'SKU-1',
    name: 'Ürün',
    category: 'Genel',
    unit: 'Adet',
    barcode: '8690001',
    listPrice: 10,
    vatRate: 20,
    stockQuantity: 12,
    isActive: true,
    isDeleted: false,
    createdAt: 't0',
    updatedAt: 't0',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
  products.set(product.id, product);
  return product;
}

describe('logoProductSyncService stock authority', () => {
  beforeEach(() => {
    products.clear();
    ordersTouched.mockReset();
    fetchLogoStockRows.mockReset();
  });

  it('A) successful Logo MERKEZ writes stockQuantity=50 and stockSource=logo', async () => {
    seedProduct({ stockQuantity: 12 });
    const rows: LogoStockRow[] = [
      {
        CODE: '8690001',
        PRODUCERCODE: 'SKU-1',
        NAME: 'Ürün',
        MERKEZ: 50,
        SATIS_FIYATI: 10,
        VAT: 20,
      },
    ];

    const { logoProductSyncService } = await import(
      '@/features/settings/services/logoProductSyncService'
    );
    const report = await logoProductSyncService.applyRows(rows);

    expect(report.success).toBe(true);
    expect(report.updated).toBe(1);
    const saved = products.get('p1');
    expect(saved?.stockQuantity).toBe(50);
    expect(saved?.stockSource).toBe('logo');
    expect(saved?.lastLogoSyncedAt).toBeTruthy();
  });

  it('F) Logo API failure preserves existing stockQuantity', async () => {
    seedProduct({ stockQuantity: 44, stockSource: 'excel' });
    fetchLogoStockRows.mockRejectedValue(
      new Error('Logo API erişilemedi. Yerel ürün/stok verileri korunur.'),
    );

    const { logoProductSyncService } = await import(
      '@/features/settings/services/logoProductSyncService'
    );
    const report = await logoProductSyncService.syncToIndexedDB();

    expect(report.success).toBe(false);
    expect(report.localDataPreserved).toBe(true);
    expect(products.get('p1')?.stockQuantity).toBe(44);
    expect(products.get('p1')?.stockSource).toBe('excel');
  });

  it('G) Logo sync does not touch order repositories', async () => {
    seedProduct();
    const { logoProductSyncService } = await import(
      '@/features/settings/services/logoProductSyncService'
    );
    await logoProductSyncService.applyRows([
      {
        CODE: '8690001',
        PRODUCERCODE: 'SKU-1',
        NAME: 'Ürün',
        MERKEZ: 50,
      },
    ]);

    expect(ordersTouched).not.toHaveBeenCalled();
  });
});
