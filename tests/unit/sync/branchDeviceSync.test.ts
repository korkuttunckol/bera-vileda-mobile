import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer, CustomerBranch } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';
import type { AppUser } from '@/shared/types/user.types';
import type { LocalSyncQueueItem } from '@/shared/lib/indexeddb/db';

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
    where(field: string) {
      return {
        equals(value: unknown) {
          return {
            async toArray(): Promise<Row[]> {
              return [...store.values()]
                .filter((row) => row[field] === value)
                .map((row) => ({ ...row }));
            },
            filter(predicate: (row: Row) => boolean) {
              return {
                async toArray(): Promise<Row[]> {
                  return [...store.values()]
                    .filter((row) => row[field] === value)
                    .filter(predicate)
                    .map((row) => ({ ...row }));
                },
              };
            },
            async first(): Promise<Row | undefined> {
              const row = [...store.values()].find((item) => item[field] === value);
              return row ? { ...row } : undefined;
            },
            async sortBy(_sortField: string): Promise<Row[]> {
              return [...store.values()]
                .filter((row) => row[field] === value)
                .map((row) => ({ ...row }));
            },
          };
        },
        anyOf(values: unknown[]) {
          return {
            async count(): Promise<number> {
              return [...store.values()].filter((row) =>
                values.includes(row[field]),
              ).length;
            },
            async toArray(): Promise<Row[]> {
              return [...store.values()]
                .filter((row) => values.includes(row[field]))
                .map((row) => ({ ...row }));
            },
          };
        },
      };
    },
    async update(key: string, patch: Row): Promise<void> {
      const existing = store.get(key);
      if (!existing) return;
      store.set(key, { ...existing, ...patch });
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
const syncQueueTable = createTable('id');

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
  PROCESSED_PREFIX: 'processed:',
} as const;

const pushBranchToFirestore = vi.fn(async () => undefined);
const pullAllBranches = vi.fn(async (): Promise<CustomerBranch[]> => []);
const pullBranchesSince = vi.fn(async (): Promise<CustomerBranch[]> => []);
const pullAllCustomers = vi.fn(async (): Promise<Customer[]> => []);
const pullAllProducts = vi.fn(async (): Promise<Product[]> => []);
const pullCustomersSince = vi.fn(async (): Promise<Customer[]> => []);
const pullProductsSince = vi.fn(async (): Promise<Product[]> => []);
const fetchAllUsersFromFirestore = vi.fn(async (): Promise<AppUser[]> => []);

vi.mock('@/config/env', () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock('@/config/app.config', () => ({
  SYNC_CONFIG: {
    processingLeaseMs: 60_000,
    maxRetries: 5,
  },
}));

vi.mock('@/shared/lib/indexeddb/db', () => ({
  META_KEYS,
  db: {
    customers: customersTable,
    branches: branchesTable,
    products: productsTable,
    users: usersTable,
    meta: metaTable,
    syncQueue: syncQueueTable,
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
  async isIdempotencyKeyProcessed(): Promise<boolean> {
    return false;
  },
  async markIdempotencyKeyProcessed(): Promise<void> {
    return undefined;
  },
}));

vi.mock('@/shared/lib/firebase/firestoreService', () => ({
  pushBranchToFirestore: (...args: unknown[]) => pushBranchToFirestore(...args),
  pullAllBranches: () => pullAllBranches(),
  pullBranchesSince: (since: string) => pullBranchesSince(since),
  pullAllCustomers: () => pullAllCustomers(),
  pullAllProducts: () => pullAllProducts(),
  pullCustomersSince: (since: string) => pullCustomersSince(since),
  pullProductsSince: (since: string) => pullProductsSince(since),
  pushOrderToFirestore: vi.fn(),
  pushCustomerToFirestore: vi.fn(),
  findOrderByLocalId: vi.fn(async () => null),
}));

vi.mock('@/shared/lib/firebase/userFirestoreService', () => ({
  fetchAllUsersFromFirestore: () => fetchAllUsersFromFirestore(),
}));

vi.mock('@/shared/lib/erp', () => ({
  erpAdapter: {
    exportOrder: vi.fn(async () => ({ success: true, deferred: true })),
  },
}));

vi.mock('@/shared/lib/indexeddb/repositories/orderRepository', () => ({
  orderLocalRepository: {
    async getById() {
      return undefined;
    },
    async updateSyncStatus() {
      return undefined;
    },
    async save() {
      return undefined;
    },
    async getLinesByOrderId() {
      return [];
    },
  },
}));

function baseCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'afm-1',
    localId: 'afm-1',
    code: 'AFM',
    name: 'AFM',
    salesRepId: 'rep-1',
    isActive: true,
    isDeleted: false,
    source: 'manual',
    syncStatus: 'synced',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'rep-1',
    updatedBy: 'rep-1',
    version: 1,
    ...overrides,
  };
}

function baseBranch(overrides: Partial<CustomerBranch> = {}): CustomerBranch {
  return {
    id: 'branch-depo',
    customerId: 'afm-1',
    name: 'DEPO',
    isActive: true,
    isDeleted: false,
    syncStatus: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'rep-1',
    updatedBy: 'rep-1',
    version: 1,
    ...overrides,
  };
}

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    sku: 'SKU-1',
    name: 'Product',
    category: 'genel',
    unit: 'AD',
    listPrice: 1,
    vatRate: 20,
    stockQuantity: 0,
    isActive: true,
    syncStatus: 'synced',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system',
    updatedBy: 'system',
    version: 1,
    ...overrides,
  };
}

describe('Branch device sync', () => {
  beforeEach(async () => {
    customersTable.store.clear();
    branchesTable.store.clear();
    productsTable.store.clear();
    usersTable.store.clear();
    metaTable.store.clear();
    syncQueueTable.store.clear();
    pushBranchToFirestore.mockClear();
    pullAllBranches.mockReset();
    pullBranchesSince.mockReset();
    pullAllCustomers.mockReset();
    pullAllProducts.mockReset();
    pullCustomersSince.mockReset();
    pullProductsSince.mockReset();
    fetchAllUsersFromFirestore.mockReset();
    pullAllBranches.mockResolvedValue([]);
    pullBranchesSince.mockResolvedValue([]);
    pullAllCustomers.mockResolvedValue([baseCustomer()]);
    pullAllProducts.mockResolvedValue([baseProduct()]);
    pullCustomersSince.mockResolvedValue([]);
    pullProductsSince.mockResolvedValue([]);
    fetchAllUsersFromFirestore.mockResolvedValue([]);
    vi.stubGlobal('navigator', { onLine: true });
    vi.resetModules();

    await customersTable.put(baseCustomer() as unknown as Row);
  });

  it('A) create DEPO → local branch + outbox + PushSync calls pushBranchToFirestore', async () => {
    const { branchService } = await import(
      '@/features/customers/services/branchService'
    );
    const { outboxProcessor } = await import(
      '@/shared/lib/sync/OutboxProcessor'
    );

    const branch = await branchService.create(
      'afm-1',
      {
        name: 'DEPO',
        address: '',
        phone: '',
        contactPerson: '',
        isActive: true,
      },
      'rep-1',
    );

    const local = await branchesTable.get(branch.id);
    expect(local).toMatchObject({
      name: 'DEPO',
      customerId: 'afm-1',
      syncStatus: 'pending',
    });

    const queue = await syncQueueTable.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      entityType: 'branch',
      entityId: branch.id,
      operation: 'create',
      status: 'pending',
    });

    const result = await outboxProcessor.processAll();
    expect(result.stats.synced).toBe(1);
    expect(pushBranchToFirestore).toHaveBeenCalledTimes(1);
    expect(pushBranchToFirestore.mock.calls[0]?.[0]).toMatchObject({
      id: branch.id,
      name: 'DEPO',
      customerId: 'afm-1',
    });
    expect(await syncQueueTable.toArray()).toHaveLength(0);
    expect((await branchesTable.get(branch.id))?.syncStatus).toBe('synced');
  });

  it('B) pull AFM DEPO + MERKEZ into IndexedDB branches', async () => {
    pullAllBranches.mockResolvedValue([
      baseBranch({
        id: 'branch-depo',
        name: 'DEPO',
        syncStatus: 'synced',
      }),
      baseBranch({
        id: 'branch-merkez',
        name: 'MERKEZ',
        syncStatus: 'synced',
      }),
    ]);

    const { pullSync } = await import('@/shared/lib/sync/PullSync');
    const stats = await pullSync.pullAll({ full: true });

    expect(stats.branches).toBe(2);
    const branches = await branchesTable.toArray();
    expect(branches).toHaveLength(2);
    expect(branches.map((b) => b.name).sort()).toEqual(['DEPO', 'MERKEZ']);
    expect(branches.every((b) => b.customerId === 'afm-1')).toBe(true);
  });

  it('C) iPhone sync: AFM customer + DEPO/MERKEZ branches available', async () => {
    customersTable.store.clear();
    pullAllCustomers.mockResolvedValue([baseCustomer()]);
    pullAllBranches.mockResolvedValue([
      baseBranch({ id: 'branch-depo', name: 'DEPO', syncStatus: 'synced' }),
      baseBranch({ id: 'branch-merkez', name: 'MERKEZ', syncStatus: 'synced' }),
    ]);

    const { pullSync } = await import('@/shared/lib/sync/PullSync');
    await pullSync.pullAll({ full: true });

    const { customerLocalRepository } = await import(
      '@/shared/lib/indexeddb/repositories/customerRepository'
    );
    const { branchLocalRepository } = await import(
      '@/shared/lib/indexeddb/repositories/branchRepository'
    );

    const customers = await customerLocalRepository.getAll();
    const afm = customers.find((c) => c.code === 'AFM');
    expect(afm).toBeTruthy();

    const branches = await branchLocalRepository.findByCustomerIdSorted(
      afm!.id,
    );
    expect(branches.map((b) => b.name)).toEqual(['DEPO', 'MERKEZ']);
  });

  it('D) soft-deleted branch stays hidden after pull', async () => {
    pullAllBranches.mockResolvedValue([
      baseBranch({
        id: 'branch-depo',
        name: 'DEPO',
        isDeleted: true,
        syncStatus: 'synced',
      }),
      baseBranch({
        id: 'branch-merkez',
        name: 'MERKEZ',
        syncStatus: 'synced',
      }),
    ]);

    const { pullSync } = await import('@/shared/lib/sync/PullSync');
    await pullSync.pullAll({ full: true });

    const { branchLocalRepository } = await import(
      '@/shared/lib/indexeddb/repositories/branchRepository'
    );
    const visible = await branchLocalRepository.findByCustomerIdSorted('afm-1');
    expect(visible.map((b) => b.name)).toEqual(['MERKEZ']);

    const all = await branchLocalRepository.getAll();
    expect(all.find((b) => b.id === 'branch-depo')?.isDeleted).toBe(true);
  });

  it('E) same branch id is not duplicated on second full pull', async () => {
    pullAllBranches.mockResolvedValue([
      baseBranch({ id: 'branch-depo', name: 'DEPO', syncStatus: 'synced' }),
    ]);

    const { pullSync } = await import('@/shared/lib/sync/PullSync');
    await pullSync.pullAll({ full: true });
    await pullSync.pullAll({ full: true });

    const branches = await branchesTable.toArray();
    expect(branches).toHaveLength(1);
    expect(branches[0]?.id).toBe('branch-depo');
  });

  it('softDelete enqueues delete and PushSync uploads deleted flag', async () => {
    await branchesTable.put(
      baseBranch({
        id: 'branch-depo',
        syncStatus: 'synced',
      }) as unknown as Row,
    );

    const { branchService } = await import(
      '@/features/customers/services/branchService'
    );
    const { outboxProcessor } = await import(
      '@/shared/lib/sync/OutboxProcessor'
    );

    await branchService.softDelete('branch-depo', 'rep-1');

    const queue = (await syncQueueTable.toArray()) as LocalSyncQueueItem[];
    expect(queue[0]).toMatchObject({
      entityType: 'branch',
      entityId: 'branch-depo',
      operation: 'delete',
    });

    await outboxProcessor.processAll();
    expect(pushBranchToFirestore).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'branch-depo',
        isDeleted: true,
      }),
    );
  });

  it('full sync drops stale synced local branch absent from Firestore', async () => {
    await branchesTable.put(
      baseBranch({
        id: 'stale-local',
        name: 'ESKI',
        syncStatus: 'synced',
      }) as unknown as Row,
    );
    pullAllBranches.mockResolvedValue([
      baseBranch({ id: 'branch-depo', name: 'DEPO', syncStatus: 'synced' }),
    ]);

    const { pullSync } = await import('@/shared/lib/sync/PullSync');
    await pullSync.pullAll({ full: true });

    const branches = await branchesTable.toArray();
    expect(branches.map((b) => b.id)).toEqual(['branch-depo']);
  });

  it('full sync preserves newer pending local branch for outbox push', async () => {
    await branchesTable.put(
      baseBranch({
        id: 'pending-local',
        name: 'YENI',
        syncStatus: 'pending',
        updatedAt: '2026-03-01T00:00:00.000Z',
      }) as unknown as Row,
    );
    pullAllBranches.mockResolvedValue([
      baseBranch({ id: 'branch-depo', name: 'DEPO', syncStatus: 'synced' }),
    ]);

    const { pullSync } = await import('@/shared/lib/sync/PullSync');
    await pullSync.pullAll({ full: true });

    const branches = await branchesTable.toArray();
    expect(branches.map((b) => b.id).sort()).toEqual([
      'branch-depo',
      'pending-local',
    ]);
  });
});
