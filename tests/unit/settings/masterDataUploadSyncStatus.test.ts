import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';

const customers = new Map<string, Customer>();
const products = new Map<string, Product>();
const users = new Map<string, { id: string; userCode: string; syncStatus: string }>();
const remoteCustomers: Customer[] = [];
const remoteProducts: Product[] = [];
const upsertUserToFirestore = vi.fn(async (user: { id: string; userCode: string }) => ({
  ...user,
  syncStatus: 'synced',
}));

const setDoc = vi.fn(async () => undefined);
const batchSets: Array<{ path: string; payload: { id: string } }> = [];
const writeBatch = vi.fn(() => {
  return {
    set: (ref: { path?: string }, payload: { id: string }) => {
      batchSets.push({ path: String(ref.path), payload });
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

vi.mock('@/shared/lib/firebase/firestoreService', () => ({
  pullAllCustomers: async () => [...remoteCustomers],
  pullAllProducts: async () => [...remoteProducts],
}));

vi.mock('@/shared/lib/firebase/userFirestoreService', () => ({
  upsertUserToFirestore: (user: { id: string; userCode: string }) =>
    upsertUserToFirestore(user),
}));

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>(
    'firebase/firestore',
  );
  return {
    ...actual,
    doc: (_db: unknown, ...pathSegments: string[]) => {
      const path = pathSegments.join('/');
      return {
        path,
        withConverter: () => ({ path }),
      };
    },
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

vi.mock('@/shared/lib/indexeddb/repositories/userRepository', () => ({
  userLocalRepository: {
    async findAll() {
      return [...users.values()];
    },
    async upsert(row: { id: string; userCode: string; syncStatus: string }) {
      users.set(row.id, { ...row });
    },
  },
}));

vi.mock('@/shared/lib/indexeddb/repositories/branchRepository', () => ({
  branchLocalRepository: {
    async getAll() {
      return [];
    },
    async saveMany() {
      return undefined;
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
    users.clear();
    remoteCustomers.length = 0;
    remoteProducts.length = 0;
    batchSets.length = 0;
    setDoc.mockClear();
    writeBatch.mockClear();
    upsertUserToFirestore.mockClear();
    upsertUserToFirestore.mockImplementation(async (user: { id: string; userCode: string }) => ({
      ...user,
      syncStatus: 'synced',
    }));
    writeBatch.mockImplementation(() => ({
      set: (ref: { path?: string }, payload: { id: string }) => {
        batchSets.push({ path: String(ref.path), payload });
      },
      commit: async () => undefined,
    }));
    vi.stubGlobal('navigator', { onLine: true });
    vi.resetModules();
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
      set: (ref: { path?: string }, payload: { id: string }) => {
        batchSets.push({ path: String(ref.path), payload });
      },
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

  it('updates existing remote customer by code instead of creating a new UUID doc', async () => {
    remoteCustomers.push(
      baseCustomer({
        id: 'remote-cust-A',
        code: 'C001',
        name: 'Eski Cari',
      }),
    );
    customers.set(
      'local-cust-B',
      baseCustomer({
        id: 'local-cust-B',
        code: 'c001',
        name: 'Yeni Import Cari',
      }),
    );

    const { localDataFirestoreUploadService } = await import(
      '@/features/settings/services/localDataFirestoreUploadService'
    );

    await localDataFirestoreUploadService.uploadAllFromIndexedDb();

    expect(batchSets).toHaveLength(1);
    expect(batchSets[0]?.path).toBe('customers/remote-cust-A');
    expect(batchSets[0]?.payload.id).toBe('remote-cust-A');
    expect(batchSets[0]?.payload).toMatchObject({
      code: 'C001',
      name: 'Yeni Import Cari',
    });
    // Local IndexedDB id stays as-is (Solution A — no id migration).
    expect(customers.get('local-cust-B')?.syncStatus).toBe('synced');
    expect(customers.has('remote-cust-A')).toBe(false);
  });

  it('updates existing remote product by sku instead of creating a new UUID doc', async () => {
    remoteProducts.push(
      baseProduct({
        id: 'remote-prod-A',
        sku: 'SKU-1',
        name: 'Eski Ürün',
      }),
    );
    products.set(
      'local-prod-B',
      baseProduct({
        id: 'local-prod-B',
        sku: 'sku-1',
        name: 'Yeni Import Ürün',
      }),
    );

    const { localDataFirestoreUploadService } = await import(
      '@/features/settings/services/localDataFirestoreUploadService'
    );

    await localDataFirestoreUploadService.uploadAllFromIndexedDb();

    expect(batchSets).toHaveLength(1);
    expect(batchSets[0]?.path).toBe('products/remote-prod-A');
    expect(batchSets[0]?.payload.id).toBe('remote-prod-A');
    expect(batchSets[0]?.payload).toMatchObject({
      sku: 'SKU-1',
      name: 'Yeni Import Ürün',
    });
    expect(products.get('local-prod-B')?.syncStatus).toBe('synced');
  });

  it('creates a new document when business key is absent remotely', async () => {
    customers.set('cust-new', baseCustomer({ id: 'cust-new', code: 'NEW1' }));
    products.set('prod-new', baseProduct({ id: 'prod-new', sku: 'NEW-SKU' }));

    const { localDataFirestoreUploadService } = await import(
      '@/features/settings/services/localDataFirestoreUploadService'
    );

    await localDataFirestoreUploadService.uploadAllFromIndexedDb();

    const paths = batchSets.map((entry) => entry.path).sort();
    expect(paths).toEqual(['customers/cust-new', 'products/prod-new']);
  });
});

describe('resolveCustomersForUpload / resolveProductsForUpload', () => {
  it('dedupes local rows by business key before resolve', async () => {
    const { resolveCustomersForUpload, resolveProductsForUpload } = await import(
      '@/features/settings/services/localDataFirestoreUploadService'
    );

    const customerWrites = resolveCustomersForUpload(
      [
        baseCustomer({
          id: 'old',
          code: 'C001',
          updatedAt: '2026-01-01T00:00:00.000Z',
          name: 'Eski',
        }),
        baseCustomer({
          id: 'new',
          code: 'C001',
          updatedAt: '2026-02-01T00:00:00.000Z',
          name: 'Yeni',
        }),
      ],
      [],
    );
    expect(customerWrites.writes).toHaveLength(1);
    expect(customerWrites.writes[0]?.payload.name).toBe('Yeni');

    const productWrites = resolveProductsForUpload(
      [
        baseProduct({
          id: 'p-old',
          sku: 'S1',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        baseProduct({
          id: 'p-new',
          sku: 'S1',
          updatedAt: '2026-02-01T00:00:00.000Z',
          name: 'Yeni Ürün',
        }),
      ],
      [baseProduct({ id: 'remote-p', sku: 'S1' })],
    );
    expect(productWrites.writes).toHaveLength(1);
    expect(productWrites.writes[0]?.payload.id).toBe('remote-p');
    expect(productWrites.writes[0]?.payload.name).toBe('Yeni Ürün');
  });
});
