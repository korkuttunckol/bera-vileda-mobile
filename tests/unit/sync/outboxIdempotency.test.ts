import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalSyncQueueItem } from '@/shared/lib/indexeddb/db';
import type { Order, OrderLine } from '@/shared/types/order.types';

const queueStore = new Map<string, LocalSyncQueueItem>();
const processedKeys = new Set<string>();
const orders = new Map<string, Order>();
const orderLines = new Map<string, OrderLine[]>();

const pushOrderToFirestore = vi.fn(async () => undefined);
const findOrderByLocalId = vi.fn(async () => null);

vi.mock('@/config/env', () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock('@/features/users/services/userPushService', () => ({
  pushPendingUsers: vi.fn(async () => ({
    total: 0,
    synced: 0,
    failed: 0,
    errors: [],
  })),
}));


vi.mock('@/shared/lib/erp', () => ({
  erpAdapter: {
    exportOrder: vi.fn(async (payload: { orderId: string }) => ({
      success: true,
      deferred: true,
      erpReferenceId: `LOGO-MANUAL-${payload.orderId.slice(0, 8).toUpperCase()}`,
    })),
  },
}));

vi.mock('@/shared/lib/indexeddb/db', () => ({
  isIdempotencyKeyProcessed: async (key: string) => processedKeys.has(key),
  markIdempotencyKeyProcessed: async (key: string) => {
    processedKeys.add(key);
  },
  META_KEYS: { PROCESSED_PREFIX: 'processed:' },
}));

vi.mock('@/shared/lib/firebase/firestoreService', () => ({
  pushOrderToFirestore: (order: Order, lines: OrderLine[]) =>
    pushOrderToFirestore(order, lines),
  findOrderByLocalId: (localId: string) => findOrderByLocalId(localId),
  pushCustomerToFirestore: vi.fn(),
  pushBranchToFirestore: vi.fn(),
}));

vi.mock('@/shared/lib/indexeddb/repositories/syncQueueRepository', () => ({
  syncQueueRepository: {
    async enqueue(item: LocalSyncQueueItem) {
      const existing = [...queueStore.values()].find(
        (row) => row.idempotencyKey === item.idempotencyKey,
      );
      if (existing) {
        if (existing.status === 'failed') {
          queueStore.set(existing.id, {
            ...item,
            id: existing.id,
            status: 'pending',
            retryCount: 0,
          });
        }
        return;
      }
      queueStore.set(item.id, { ...item });
    },
    async getPending() {
      return [...queueStore.values()]
        .filter((row) => row.status === 'pending')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async getFailed() {
      return [...queueStore.values()].filter((row) => row.status === 'failed');
    },
    async findStuckProcessing(leaseMs: number, nowMs: number = Date.now()) {
      return [...queueStore.values()].filter((row) => {
        if (row.status !== 'processing') return false;
        if (!row.lastAttemptAt) return true;
        const attemptedAt = Date.parse(row.lastAttemptAt);
        if (Number.isNaN(attemptedAt)) return true;
        return nowMs - attemptedAt >= leaseMs;
      });
    },
    async markProcessing(id: string) {
      const item = queueStore.get(id);
      if (!item) return;
      queueStore.set(id, {
        ...item,
        status: 'processing',
        lastAttemptAt: new Date().toISOString(),
      });
    },
    async markFailed(id: string, retryCount: number) {
      const item = queueStore.get(id);
      if (!item) return;
      queueStore.set(id, {
        ...item,
        status: 'failed',
        retryCount,
        lastAttemptAt: new Date().toISOString(),
      });
    },
    async resetToPending(id: string, retryCount: number) {
      const item = queueStore.get(id);
      if (!item) return;
      queueStore.set(id, {
        ...item,
        status: 'pending',
        retryCount,
        lastAttemptAt: new Date().toISOString(),
      });
    },
    async remove(id: string) {
      queueStore.delete(id);
    },
    async findByIdempotencyKey(key: string) {
      return [...queueStore.values()].find((row) => row.idempotencyKey === key);
    },
    async findOtherProcessingByIdempotencyKey(key: string, excludeItemId: string) {
      const item = [...queueStore.values()].find(
        (row) => row.idempotencyKey === key,
      );
      if (
        item &&
        item.status === 'processing' &&
        item.id !== excludeItemId
      ) {
        return item;
      }
      return undefined;
    },
  },
}));

vi.mock('@/shared/lib/indexeddb/repositories/orderRepository', () => ({
  orderLocalRepository: {
    async getById(id: string) {
      return orders.get(id);
    },
    async getLinesByOrderId(orderId: string) {
      return orderLines.get(orderId) ?? [];
    },
    async updateSyncStatus(
      id: string,
      orderSyncStatus: Order['orderSyncStatus'],
      syncStatus: Order['syncStatus'],
      syncError?: string,
    ) {
      const order = orders.get(id);
      if (!order) return;
      orders.set(id, {
        ...order,
        orderSyncStatus,
        syncStatus,
        syncError,
        updatedAt: new Date().toISOString(),
      });
    },
    async save(order: Order) {
      orders.set(order.id, { ...order });
    },
  },
}));

vi.mock('@/shared/lib/indexeddb/repositories/customerRepository', () => ({
  customerLocalRepository: {
    getById: vi.fn(),
    save: vi.fn(),
  },
}));

vi.mock('@/shared/lib/indexeddb/repositories/branchRepository', () => ({
  branchLocalRepository: {
    getById: vi.fn(),
    save: vi.fn(),
  },
}));

function seedPendingOrder(orderId: string): Order {
  const now = new Date().toISOString();
  const order: Order = {
    id: orderId,
    localId: `local-${orderId}`,
    customerId: 'cust-1',
    customerName: 'Test Cari',
    customerCode: 'C001',
    salesRepId: 'MERCH01',
    status: 'submitted',
    orderSyncStatus: 'pending_offline',
    orderDate: now,
    subtotal: 100,
    discountTotal: 0,
    vatTotal: 20,
    grandTotal: 120,
    lineCount: 1,
    itemCount: 2,
    createdOffline: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'MERCH01',
    updatedBy: 'MERCH01',
    version: 1,
    syncStatus: 'pending',
    erpSyncStatus: 'none',
  };

  orders.set(orderId, order);
  orderLines.set(orderId, [
    {
      id: 'line-1',
      orderId,
      productId: 'prod-1',
      productSku: 'SKU-1',
      productName: 'Ürün 1',
      quantity: 2,
      unitPrice: 50,
      discountRate: 0,
      vatRate: 20,
      lineTotal: 100,
      sortOrder: 0,
    },
  ]);

  return order;
}

describe('Outbox / Idempotency self-skip fix', () => {
  beforeEach(() => {
    queueStore.clear();
    processedKeys.clear();
    orders.clear();
    orderLines.clear();
    pushOrderToFirestore.mockClear();
    findOrderByLocalId.mockClear();
    findOrderByLocalId.mockResolvedValue(null);
  });

  it('enqueue → process → pushOrderToFirestore exactly once → local sent → queue removed', async () => {
    const { outboxProcessor } = await import(
      '@/shared/lib/sync/OutboxProcessor'
    );

    const orderId = 'order-1';
    seedPendingOrder(orderId);

    await outboxProcessor.enqueue({
      entityType: 'order',
      entityId: orderId,
      operation: 'create',
      data: { orderId, localId: `local-${orderId}` },
    });

    expect(queueStore.size).toBe(1);
    const queued = [...queueStore.values()][0];
    expect(queued.status).toBe('pending');

    const result = await outboxProcessor.processAll();

    expect(pushOrderToFirestore).toHaveBeenCalledTimes(1);
    expect(pushOrderToFirestore).toHaveBeenCalledWith(
      expect.objectContaining({ id: orderId }),
      expect.arrayContaining([
        expect.objectContaining({ productSku: 'SKU-1', quantity: 2 }),
      ]),
    );

    const local = orders.get(orderId);
    expect(local?.orderSyncStatus).toBe('sent');
    expect(local?.syncStatus).toBe('synced');

    expect(queueStore.size).toBe(0);
    expect(result.stats.synced).toBe(1);
    expect(result.stats.skipped).toBe(0);
    expect(result.stats.failed).toBe(0);
  });

  it('does not mark order sent when skipped due to already-processed key', async () => {
    const { outboxProcessor } = await import(
      '@/shared/lib/sync/OutboxProcessor'
    );
    const { buildIdempotencyKey } = await import(
      '@/shared/lib/sync/IdempotencyGuard'
    );

    const orderId = 'order-2';
    seedPendingOrder(orderId);

    await outboxProcessor.enqueue({
      entityType: 'order',
      entityId: orderId,
      operation: 'create',
      data: { orderId, localId: `local-${orderId}` },
    });

    processedKeys.add(buildIdempotencyKey('order', orderId, 'create'));

    const result = await outboxProcessor.processAll();

    expect(pushOrderToFirestore).not.toHaveBeenCalled();
    expect(orders.get(orderId)?.orderSyncStatus).toBe('pending_offline');
    expect(orders.get(orderId)?.syncStatus).toBe('pending');
    expect(queueStore.size).toBe(0);
    expect(result.stats.skipped).toBe(1);
  });
});
