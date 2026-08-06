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
  LAST_SYNC_AT: 'lastSyncAt',
  LAST_SYNC_REPORT_ID: 'lastSyncReportId',
  INITIAL_SYNC_COMPLETE: 'initialSyncComplete',
  DATA_SOURCE_CUSTOMERS: 'dataSource:customers',
  DATA_SOURCE_PRODUCTS: 'dataSource:products',
  DATA_SOURCE_USERS: 'dataSource:users',
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

vi.mock('@/shared/lib/firebase/firestoreService', () => ({
  pullAllCustomers: vi.fn(async () => [
    {
      id: 'cust-remote-1',
      code: 'C001',
      name: 'Remote Customer',
      salesRepId: 'rep-1',
      isActive: true,
      isDeleted: false,
      source: 'manual',
      syncStatus: 'synced',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'system',
      updatedBy: 'system',
      version: 1,
    } satisfies Customer,
  ]),
  pullAllProducts: vi.fn(async () => [
    {
      id: 'prod-remote-1',
      sku: 'SKU-1',
      name: 'Remote Product',
      category: 'genel',
      unit: 'AD',
      listPrice: 10,
      vatRate: 20,
      stockQuantity: 0,
      isActive: true,
      syncStatus: 'synced',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'system',
      updatedBy: 'system',
      version: 1,
    } satisfies Product,
  ]),
  pullCustomersSince: vi.fn(async () => []),
  pullProductsSince: vi.fn(async () => []),
}));

vi.mock('@/shared/lib/firebase/userFirestoreService', () => ({
  fetchAllUsersFromFirestore: vi.fn(async () => [
    {
      id: 'ADMIN',
      userCode: 'ADMIN',
      passwordHash: 'hash',
      name: 'Admin',
      role: 'admin',
      active: true,
      isDeleted: false,
      syncStatus: 'synced',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies AppUser,
  ]),
}));

vi.mock('@/shared/lib/indexeddb/repositories/userRepository', () => ({
  userLocalRepository: {
    async findAll() {
      return usersTable.toArray() as unknown as AppUser[];
    },
    async replaceAll(users: AppUser[]) {
      usersTable.store.clear();
      for (const user of users) {
        await usersTable.put(user as unknown as Row);
      }
    },
  },
}));

const localBranch: CustomerBranch = {
  id: 'branch-local-1',
  customerId: 'cust-local-1',
  name: 'Ankara Şube',
  isActive: true,
  isDeleted: false,
  syncStatus: 'pending',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'rep-1',
  updatedBy: 'rep-1',
  version: 1,
};

describe('PullSync full replace preserves local branches', () => {
  beforeEach(async () => {
    customersTable.store.clear();
    branchesTable.store.clear();
    productsTable.store.clear();
    usersTable.store.clear();
    metaTable.store.clear();

    vi.stubGlobal('navigator', { onLine: true });

    await customersTable.put({
      id: 'cust-local-1',
      code: 'LOCAL',
      name: 'Local Customer',
      salesRepId: 'rep-1',
      isActive: true,
      isDeleted: false,
      source: 'manual',
      syncStatus: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'rep-1',
      updatedBy: 'rep-1',
      version: 1,
    });
    await branchesTable.put({ ...localBranch });
    await productsTable.put({
      id: 'prod-local-1',
      sku: 'LOCAL-SKU',
      name: 'Local Product',
      category: 'genel',
      unit: 'AD',
      listPrice: 1,
      vatRate: 20,
      stockQuantity: 0,
      isActive: true,
      syncStatus: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'rep-1',
      updatedBy: 'rep-1',
      version: 1,
    });
  });

  it('keeps local branches after pullAll({ full: true }) while replacing other master data', async () => {
    const { pullSync } = await import('@/shared/lib/sync/PullSync');

    const stats = await pullSync.pullAll({ full: true });

    expect(stats.full).toBe(true);
    expect(stats.customers).toBe(1);
    expect(stats.products).toBe(1);
    expect(stats.users).toBe(1);

    const branches = await branchesTable.toArray();
    expect(branches).toHaveLength(1);
    expect(branches[0]).toMatchObject({
      id: 'branch-local-1',
      name: 'Ankara Şube',
      syncStatus: 'pending',
    });

    const customers = await customersTable.toArray();
    expect(customers).toHaveLength(1);
    expect(customers[0]?.id).toBe('cust-remote-1');

    const products = await productsTable.toArray();
    expect(products).toHaveLength(1);
    expect(products[0]?.id).toBe('prod-remote-1');

    const users = await usersTable.toArray();
    expect(users).toHaveLength(1);
    expect(users[0]?.id).toBe('ADMIN');
  });
});
