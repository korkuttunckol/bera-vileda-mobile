import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer, CustomerBranch } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';
import type { AppUser } from '@/shared/types/user.types';

type Row = Record<string, unknown>;

function createTable(keyField: string) {
  const store = new Map<string, Row>();

  return {
    store,
    async clear(): Promise<void> {
      store.clear();
    },
    async bulkPut(rows: Row[]): Promise<void> {
      for (const row of rows) {
        store.set(String(row[keyField]), { ...row });
      }
    },
    async put(row: Row): Promise<void> {
      store.set(String(row[keyField]), { ...row });
    },
    async get(key: string): Promise<Row | undefined> {
      const row = store.get(key);
      return row ? { ...row } : undefined;
    },
    async toArray(): Promise<Row[]> {
      return [...store.values()].map((row) => ({ ...row }));
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    orderBy(_field: string) {
      return {
        async toArray(): Promise<Row[]> {
          return [...store.values()].map((row) => ({ ...row }));
        },
      };
    },
  };
}

const customersTable = createTable('id');
const branchesTable = createTable('id');
const productsTable = createTable('id');
const usersTable = createTable('id');
const metaTable = createTable('key');

const META_KEYS = {
  LAST_PULL_CUSTOMERS: 'lastPullSyncAt:customers',
  LAST_PULL_PRODUCTS: 'lastPullSyncAt:products',
  LAST_PULL_BRANCHES: 'lastPullSyncAt:branches',
  LAST_SYNC_AT: 'lastSyncAt',
  LAST_SYNC_REPORT_ID: 'lastSyncReportId',
  INITIAL_SYNC_COMPLETE: 'initialSyncComplete',
  DATA_SOURCE_CUSTOMERS: 'dataSource:customers',
  DATA_SOURCE_PRODUCTS: 'dataSource:products',
  DATA_SOURCE_USERS: 'dataSource:users',
  LAST_LOGO_PRODUCT_SYNC_AT: 'lastLogoProductSyncAt',
  PROCESSED_PREFIX: 'processed:',
} as const;

vi.mock('@/config/env', () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock('@/shared/lib/indexeddb/db', () => ({
  META_KEYS,
  db: {
    customers: customersTable,
    branches: branchesTable,
    products: productsTable,
    users: usersTable,
    meta: metaTable,
    async transaction(
      _mode: string,
      _tables: unknown,
      fn: () => Promise<void>,
    ): Promise<void> {
      await fn();
    },
  },
  async getMetaValue(key: string): Promise<string | undefined> {
    const record = await metaTable.get(key);
    return record?.value as string | undefined;
  },
  async setMetaValue(key: string, value: string): Promise<void> {
    await metaTable.put({ key, value });
  },
}));

const pullAllCustomers = vi.fn(async (): Promise<Customer[]> => []);
const pullAllProducts = vi.fn(async (): Promise<Product[]> => []);
const pullAllBranches = vi.fn(async (): Promise<CustomerBranch[]> => []);
const pullCustomersSince = vi.fn(async (): Promise<Customer[]> => []);
const pullProductsSince = vi.fn(async (): Promise<Product[]> => []);
const pullBranchesSince = vi.fn(async (): Promise<CustomerBranch[]> => []);
const fetchAllUsersFromFirestore = vi.fn(async (): Promise<AppUser[]> => []);

vi.mock('@/shared/lib/firebase/firestoreService', () => ({
  pullAllCustomers: () => pullAllCustomers(),
  pullAllProducts: () => pullAllProducts(),
  pullAllBranches: () => pullAllBranches(),
  pullCustomersSince: () => pullCustomersSince(),
  pullProductsSince: () => pullProductsSince(),
  pullBranchesSince: () => pullBranchesSince(),
}));

vi.mock('@/shared/lib/firebase/userFirestoreService', () => ({
  fetchAllUsersFromFirestore: () => fetchAllUsersFromFirestore(),
}));

vi.mock('@/shared/lib/sync/syncPullLogger', () => ({
  logBranchesFetchEnd: vi.fn(),
  logBranchesFetchStart: vi.fn(),
  logCustomersFetchEnd: vi.fn(),
  logCustomersFetchStart: vi.fn(),
  logIndexedDbWriteEnd: vi.fn(),
  logIndexedDbWriteStart: vi.fn(),
  logProductsFetchEnd: vi.fn(),
  logProductsFetchStart: vi.fn(),
  logSyncComplete: vi.fn(),
  logSyncFailed: vi.fn(),
  logSyncStart: vi.fn(),
  logUsersFetchEnd: vi.fn(),
  logUsersFetchStart: vi.fn(),
  runTimedFetch: async <T>(
    _start: () => void,
    _end: (n: number) => void,
    fn: () => Promise<T>,
  ): Promise<T> => fn(),
  wrapCollectionError: (err: unknown) => err,
}));

vi.mock('@/shared/lib/sync/syncPullValidation', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/sync/syncPullValidation')
  >('@/shared/lib/sync/syncPullValidation');
  return {
    ...actual,
    recordPullValidation: vi.fn(),
  };
});

function makeProduct(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    localId: overrides.id,
    sku: 'SKU-1',
    name: 'Local',
    category: 'Genel',
    unit: 'Adet',
    barcode: 'BC-1',
    listPrice: 10,
    vatRate: 20,
    stockQuantity: 0,
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedBy: 'u1',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

function makeCustomer(): Customer {
  return {
    id: 'c1',
    code: 'C1',
    name: 'Cari',
    salesRepId: 'r1',
    isActive: true,
    isDeleted: false,
    createdAt: 't',
    updatedAt: 't',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'synced',
  };
}

describe('PullSync Logo stock preservation', () => {
  beforeEach(async () => {
    vi.stubGlobal('navigator', { onLine: true });
    customersTable.store.clear();
    productsTable.store.clear();
    branchesTable.store.clear();
    usersTable.store.clear();
    metaTable.store.clear();
    pullAllCustomers.mockReset();
    pullAllProducts.mockReset();
    pullAllBranches.mockReset();
    pullCustomersSince.mockReset();
    pullProductsSince.mockReset();
    pullBranchesSince.mockReset();
    fetchAllUsersFromFirestore.mockReset();
    fetchAllUsersFromFirestore.mockResolvedValue([]);
    pullAllBranches.mockResolvedValue([]);
    pullBranchesSince.mockResolvedValue([]);
    await metaTable.put({ key: META_KEYS.INITIAL_SYNC_COMPLETE, value: 'true' });
  });

  it('D) full pull preserves Logo stockQuantity across products.clear()', async () => {
    await productsTable.put(
      makeProduct({
        id: 'p1',
        stockQuantity: 50,
        stockSource: 'logo',
        lastLogoSyncedAt: 'logo-t',
        version: 1,
      }),
    );
    await customersTable.put(makeCustomer());

    pullAllCustomers.mockResolvedValue([makeCustomer()]);
    pullAllProducts.mockResolvedValue([
      makeProduct({
        id: 'p1',
        name: 'Remote Name',
        stockQuantity: 30,
        version: 9,
      }),
    ]);

    const { pullSync } = await import('@/shared/lib/sync/PullSync');
    await pullSync.pullAll({ full: true });

    const stored = (await productsTable.get('p1')) as Product;
    expect(stored.stockQuantity).toBe(50);
    expect(stored.stockSource).toBe('logo');
    expect(stored.lastLogoSyncedAt).toBe('logo-t');
    expect(stored.name).toBe('Remote Name');
  });

  it('E) incremental pull preserves Logo stock when remote version wins', async () => {
    await productsTable.put(
      makeProduct({
        id: 'p1',
        stockQuantity: 50,
        stockSource: 'logo',
        lastLogoSyncedAt: 'logo-t',
        version: 1,
      }),
    );

    pullCustomersSince.mockResolvedValue([]);
    pullProductsSince.mockResolvedValue([
      makeProduct({
        id: 'p1',
        name: 'Inc Remote',
        stockQuantity: 70,
        version: 5,
      }),
    ]);

    const { pullSync } = await import('@/shared/lib/sync/PullSync');
    await pullSync.pullAll({ full: false });

    const stored = (await productsTable.get('p1')) as Product;
    expect(stored.stockQuantity).toBe(50);
    expect(stored.stockSource).toBe('logo');
    expect(stored.name).toBe('Inc Remote');
  });

  it('H) incremental pull still applies remote stock when not logo-authored', async () => {
    await productsTable.put(
      makeProduct({
        id: 'p1',
        stockQuantity: 50,
        stockSource: 'excel',
        version: 1,
      }),
    );

    pullCustomersSince.mockResolvedValue([]);
    pullProductsSince.mockResolvedValue([
      makeProduct({
        id: 'p1',
        stockQuantity: 70,
        version: 5,
      }),
    ]);

    const { pullSync } = await import('@/shared/lib/sync/PullSync');
    await pullSync.pullAll({ full: false });

    const stored = (await productsTable.get('p1')) as Product;
    expect(stored.stockQuantity).toBe(70);
  });
});
