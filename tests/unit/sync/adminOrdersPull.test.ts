import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order, OrderLine } from '@/shared/types/order.types';

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
        equals(value: string) {
          const matches = () =>
            [...store.entries()].filter(([, row]) => row[field] === value);

          return {
            async first(): Promise<Row | undefined> {
              const hits = matches();
              if (hits.length === 0) return undefined;
              return { ...hits[0][1] };
            },
            async toArray(): Promise<Row[]> {
              return matches().map(([, row]) => ({ ...row }));
            },
            async delete(): Promise<void> {
              for (const [key] of matches()) {
                store.delete(key);
              }
            },
            filter(predicate: (row: Row) => boolean) {
              return {
                async toArray(): Promise<Row[]> {
                  return matches()
                    .map(([, row]) => ({ ...row }))
                    .filter(predicate);
                },
              };
            },
          };
        },
      };
    },
    filter(predicate: (row: Row) => boolean) {
      return {
        async toArray(): Promise<Row[]> {
          return [...store.values()]
            .map((row) => ({ ...row }))
            .filter(predicate);
        },
      };
    },
  };
}

const ordersTable = createTable('id');
const orderLinesTable = createTable('id');

vi.mock('@/shared/lib/indexeddb/db', () => ({
  db: {
    orders: ordersTable,
    orderLines: orderLinesTable,
    async transaction(
      _mode: string,
      _tables: unknown,
      fn: () => Promise<void>,
    ): Promise<void> {
      await fn();
    },
  },
}));

const pullAllOrders = vi.fn(async (): Promise<Order[]> => []);
const pullOrderLines = vi.fn(async (_orderId: string): Promise<OrderLine[]> => []);

vi.mock('@/shared/lib/firebase/firestoreService', () => ({
  pullAllOrders: () => pullAllOrders(),
  pullOrderLines: (orderId: string) => pullOrderLines(orderId),
}));

function makeRemoteOrder(overrides: Partial<Order> = {}): Order {
  const now = '2026-08-08T12:00:00.000Z';
  return {
    id: 'order-remote-1',
    localId: 'local-remote-1',
    customerId: 'cust-1',
    customerName: 'Test Cari',
    customerCode: 'C001',
    salesRepId: 'merch-1',
    status: 'submitted',
    orderSyncStatus: 'sent',
    orderDate: now,
    subtotal: 100,
    discountTotal: 0,
    vatTotal: 20,
    grandTotal: 120,
    lineCount: 1,
    itemCount: 2,
    createdOffline: true,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'merch-1',
    updatedBy: 'merch-1',
    version: 1,
    syncStatus: 'synced',
    erpSyncStatus: 'none',
    ...overrides,
  };
}

function makeLine(
  orderId: string,
  overrides: Partial<OrderLine> = {},
): OrderLine {
  return {
    id: 'line-1',
    orderId,
    productId: 'prod-1',
    productSku: 'SKU-1',
    productName: 'Ürün 1',
    quantity: 2,
    unitPrice: 50,
    discountRate: 0,
    vatRate: 20,
    lineTotal: 120,
    sortOrder: 0,
    ...overrides,
  };
}

describe('Admin order pull merge', () => {
  beforeEach(async () => {
    ordersTable.store.clear();
    orderLinesTable.store.clear();
    pullAllOrders.mockReset();
    pullOrderLines.mockReset();
    vi.resetModules();
  });

  it('writes Firestore remote order + lines into IndexedDB', async () => {
    const remote = makeRemoteOrder();
    const lines = [makeLine(remote.id), makeLine(remote.id, { id: 'line-2', sortOrder: 1 })];
    pullAllOrders.mockResolvedValue([remote]);
    pullOrderLines.mockResolvedValue(lines);

    const { pullAndMergeOrders } = await import('@/shared/lib/sync/OrderPullSync');
    const { orderLocalRepository } = await import(
      '@/shared/lib/indexeddb/repositories/orderRepository'
    );

    const stats = await pullAndMergeOrders();

    expect(stats).toEqual({ pulled: 1, updated: 0, skipped: 0 });
    const local = await orderLocalRepository.getById(remote.id);
    expect(local?.customerName).toBe('Test Cari');
    expect(local?.orderSyncStatus).toBe('sent');
    expect(local?.syncStatus).toBe('synced');
    expect(local?.salesRepId).toBe('merch-1');

    const localLines = await orderLocalRepository.getLinesByOrderId(remote.id);
    expect(localLines).toHaveLength(2);
  });

  it('does not duplicate the same order on second sync', async () => {
    const remote = makeRemoteOrder({ customerName: 'İlk' });
    pullAllOrders.mockResolvedValue([remote]);
    pullOrderLines.mockResolvedValue([makeLine(remote.id)]);

    const { pullAndMergeOrders } = await import('@/shared/lib/sync/OrderPullSync');
    const { orderLocalRepository } = await import(
      '@/shared/lib/indexeddb/repositories/orderRepository'
    );

    await pullAndMergeOrders();
    pullAllOrders.mockResolvedValue([
      makeRemoteOrder({ customerName: 'Güncel', updatedAt: '2026-08-08T13:00:00.000Z' }),
    ]);
    const second = await pullAndMergeOrders();

    expect(second).toEqual({ pulled: 1, updated: 1, skipped: 0 });
    const all = await orderLocalRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.customerName).toBe('Güncel');
  });

  it('does not duplicate order lines on second sync', async () => {
    const remote = makeRemoteOrder();
    pullAllOrders.mockResolvedValue([remote]);
    pullOrderLines.mockResolvedValue([
      makeLine(remote.id, { id: 'line-a' }),
      makeLine(remote.id, { id: 'line-b', sortOrder: 1 }),
    ]);

    const { pullAndMergeOrders } = await import('@/shared/lib/sync/OrderPullSync');
    const { orderLocalRepository } = await import(
      '@/shared/lib/indexeddb/repositories/orderRepository'
    );

    await pullAndMergeOrders();
    await pullAndMergeOrders();

    const lines = await orderLocalRepository.getLinesByOrderId(remote.id);
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.id).sort()).toEqual(['line-a', 'line-b']);
  });

  it('removes stale local lines when remote lines change', async () => {
    const remote = makeRemoteOrder();
    const { orderLocalRepository } = await import(
      '@/shared/lib/indexeddb/repositories/orderRepository'
    );

    await orderLocalRepository.replaceWithLines(remote, [
      makeLine(remote.id, { id: 'stale-1' }),
      makeLine(remote.id, { id: 'stale-2', sortOrder: 1 }),
    ]);

    pullAllOrders.mockResolvedValue([remote]);
    pullOrderLines.mockResolvedValue([makeLine(remote.id, { id: 'fresh-1' })]);

    const { pullAndMergeOrders } = await import('@/shared/lib/sync/OrderPullSync');
    await pullAndMergeOrders();

    const lines = await orderLocalRepository.getLinesByOrderId(remote.id);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.id).toBe('fresh-1');
  });

  it('does not overwrite local pending_offline / sending / failed orders', async () => {
    const { orderLocalRepository } = await import(
      '@/shared/lib/indexeddb/repositories/orderRepository'
    );

    const pending = makeRemoteOrder({
      orderSyncStatus: 'pending_offline',
      syncStatus: 'pending',
      customerName: 'Local Pending',
    });
    await orderLocalRepository.save(pending);
    await orderLocalRepository.saveLines([
      makeLine(pending.id, { id: 'local-line', productName: 'Local Line' }),
    ]);

    pullAllOrders.mockResolvedValue([
      makeRemoteOrder({
        customerName: 'Remote Should Not Win',
        orderSyncStatus: 'sent',
        syncStatus: 'synced',
      }),
    ]);
    pullOrderLines.mockResolvedValue([
      makeLine(pending.id, { id: 'remote-line', productName: 'Remote Line' }),
    ]);

    const { pullAndMergeOrders } = await import('@/shared/lib/sync/OrderPullSync');
    const stats = await pullAndMergeOrders();

    expect(stats).toEqual({ pulled: 0, updated: 0, skipped: 1 });
    const local = await orderLocalRepository.getById(pending.id);
    expect(local?.customerName).toBe('Local Pending');
    expect(local?.orderSyncStatus).toBe('pending_offline');
    const lines = await orderLocalRepository.getLinesByOrderId(pending.id);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.id).toBe('local-line');
  });

  it('preserves remote isDeleted on merge', async () => {
    const remote = makeRemoteOrder({ isDeleted: true, deletedAt: '2026-08-08T14:00:00.000Z' });
    pullAllOrders.mockResolvedValue([remote]);
    pullOrderLines.mockResolvedValue([]);

    const { pullAndMergeOrders } = await import('@/shared/lib/sync/OrderPullSync');
    const { orderLocalRepository } = await import(
      '@/shared/lib/indexeddb/repositories/orderRepository'
    );

    await pullAndMergeOrders();
    const local = await orderLocalRepository.getById(remote.id);
    expect(local?.isDeleted).toBe(true);
    const visible = await orderLocalRepository.findAllForUser('admin-1', true);
    expect(visible).toHaveLength(0);
  });
});
