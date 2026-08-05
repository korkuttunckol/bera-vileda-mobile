import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';

const customers = new Map<string, Customer>();
const products = new Map<string, Product>();

const setDoc = vi.fn(async () => undefined);
const writeBatch = vi.fn(() => {
  const ops: unknown[] = [];
  return {
    set: (...args: unknown[]) => {
      ops.push(args);
    },
    commit: async () => undefined,
  };
});

vi.mock('@/config/env', () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock('@/shared/lib/firebase/firestore', () => ({
  getFirestoreDb: () => ({ name: 'mock-db' }),
}));

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>(
    'firebase/firestore',
  );
  return {
    ...actual,
    doc: (_db: unknown, collection: string, id: string) => ({
      path: `${collection}/${id}`,
      withConverter: () => ({ path: `${collection}/${id}` }),
    }),
    setDoc: (...args: unknown[]) => setDoc(...args),
    writeBatch: () => writeBatch(),
  };
});

vi.mock('@/shared/lib/indexeddb/repositories/customerRepository', () => ({
  customerLocalRepository: {
    async getAll() {
      return [...customers.values()];
    },
    async saveMany(rows: Customer[]) {
      for (const row of rows) {
        customers.set(row.id, { ...row });
      }
    },
  },
}));

vi.mock('@/shared/lib/indexeddb/repositories/productRepository', () => ({
  productLocalRepository: {
    async getAll() {
      return [...products.values()];
    },
    async saveMany(rows: Product[]) {
      for (const row of rows) {
        products.set(row.id, { ...row });
      }
    },
  },
}));

function baseCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust-1',
    localId: 'cust-1',
    salesRepId: 'rep-1',
    code: 'C001',
    name: 'Excel Cari',
    address: { city: 'Ankara' },
    isActive: true,
    isDeleted: false,
    source: 'excel',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'rep-1',
    updatedBy: 'rep-1',
    version: 1,
    syncStatus: 'pending',
    ...overrides,
  };
}

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    localId: 'prod-1',
    sku: 'SKU-1',
    name: 'Excel Ürün',
    barcode: '123',
    category: 'Genel',
    unit: 'Adet',
    listPrice: 0,
    vatRate: 20,
    stockQuantity: 0,
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'rep-1',
    updatedBy: 'rep-1',
    version: 1,
    syncStatus: 'pending',
    ...overrides,
  };
}

describe('Master data upload syncStatus', () => {
  beforeEach(() => {
    customers.clear();
    products.clear();
    setDoc.mockClear();
    writeBatch.mockClear();
    vi.stubGlobal('navigator', { onLine: true });
  });

  it('marks successfully uploaded customers/products as synced', async () => {
    customers.set('cust-1', baseCustomer());
    products.set('prod-1', baseProduct());

    const { localDataFirestoreUploadService } = await import(
      '@/features/settings/services/localDataFirestoreUploadService'
    );

    const result = await localDataFirestoreUploadService.uploadAllFromIndexedDb();

    expect(result.customers.total).toBe(1);
    expect(result.customers.written).toBe(1);
    expect(result.products.total).toBe(1);
    expect(result.products.written).toBe(1);
    expect(customers.get('cust-1')?.syncStatus).toBe('synced');
    expect(products.get('prod-1')?.syncStatus).toBe('synced');
  });

  it('keeps failed customer pending while marking successful ones synced', async () => {
    customers.set('cust-ok', baseCustomer({ id: 'cust-ok', code: 'OK' }));
    customers.set('cust-bad', baseCustomer({ id: 'cust-bad', code: 'BAD' }));

    writeBatch.mockImplementation(() => ({
      set: () => undefined,
      commit: async () => {
        throw new Error('batch failed');
      },
    }));

    setDoc.mockImplementation(async (ref: { path?: string }) => {
      if (String(ref.path).includes('cust-bad')) {
        throw new Error('invalid phone');
      }
    });

    const { localDataFirestoreUploadService } = await import(
      '@/features/settings/services/localDataFirestoreUploadService'
    );

    const result = await localDataFirestoreUploadService.uploadAllFromIndexedDb();

    expect(result.customers.written).toBe(1);
    expect(result.customers.failed).toBe(1);
    expect(customers.get('cust-ok')?.syncStatus).toBe('synced');
    expect(customers.get('cust-bad')?.syncStatus).toBe('pending');
  });
});
