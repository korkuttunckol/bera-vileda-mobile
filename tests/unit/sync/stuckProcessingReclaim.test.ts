import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SYNC_CONFIG } from '@/config/app.config';
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
    async findOtherProcessingByIdempotencyKey(
      key: string,
      excludeItemId: string,
    ) {
      const item = [...queueStore.values()].find(
        (row) => row.idempotencyKey === key,
      );
      if (item?.status === 'processing' && item.id !== excludeItemId) {
        return item;
      }
      return undefined;
    },
  },
}));

const updateSyncStatusCalls: Array<{
  id: string;
  orderSyncStatus: Order['orderSyncStatus'];
  syncStatus: Order['syncStatus'];
}> = [];

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
      updateSyncStatusCalls.push({ id, orderSyncStatus, syncStatus });
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

function baseOrder(overrides: Partial<Order> = {}): Order {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 'order-stuck-1',
    localId: 'local-stuck-1',
    customerId: 'cust-1',
    customerName: 'Test',
    customerCode: 'C001',
    salesRepId: 'rep-1',
    status: 'submitted',
    syncStatus: 'pending',
    orderSyncStatus: 'sending',
    orderDate: now,
    subtotal: 10,
    discountTotal: 0,
    vatTotal: 0,
    grandTotal: 10,
    lineCount: 0,
    createdOffline: true,
    isDeleted: false,
    erpSyncStatus: 'none',
    createdAt: now,
    updatedAt: now,
    createdBy: 'rep-1',
    updatedBy: 'rep-1',
    version: 1,
    ...overrides,
  };
}

function stuckQueueItem(
  overrides: Partial<LocalSyncQueueItem> = {},
): LocalSyncQueueItem {
  const staleAt = new Date(
    Date.now() - SYNC_CONFIG.processingLeaseMs - 1_000,
  ).toISOString();

  return {
    id: 'queue-stuck-1',
    entityType: 'order',
    entityId: 'order-stuck-1',
    operation: 'create',
    idempotencyKey: 'order:order-stuck-1:create',
    payload: JSON.stringify({ orderId: 'order-stuck-1' }),
    retryCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastAttemptAt: staleAt,
    status: 'processing',
    ...overrides,
  };
}

describe('Outbox stuck processing reclaim', () => {
  beforeEach(() => {
    queueStore.clear();
    processedKeys.clear();
    orders.clear();
    orderLines.clear();
    updateSyncStatusCalls.length = 0;
    pushOrderToFirestore.mockClear();
    findOrderByLocalId.mockClear();
    findOrderByLocalId.mockResolvedValue(null);
    vi.resetModules();
  });

  it('reclaims stale processing → pending with same retryCount, then pushes', async () => {
    const item = stuckQueueItem({ retryCount: 2 });
    queueStore.set(item.id, item);
    orders.set('order-stuck-1', baseOrder({ orderSyncStatus: 'sending' }));
    orderLines.set('order-stuck-1', []);

    const { outboxProcessor } = await import('@/shared/lib/sync/OutboxProcessor');
    const result = await outboxProcessor.processAll();

    expect(result.stats.synced).toBe(1);
    expect(queueStore.size).toBe(0);
    expect(pushOrderToFirestore).toHaveBeenCalledTimes(1);
    expect(orders.get('order-stuck-1')?.orderSyncStatus).toBe('sent');
  });

  it('does not reclaim fresh processing within lease', async () => {
    const fresh = stuckQueueItem({
      lastAttemptAt: new Date().toISOString(),
      retryCount: 1,
    });
    queueStore.set(fresh.id, fresh);
    orders.set(
      'order-stuck-1',
      baseOrder({ orderSyncStatus: 'sending', syncStatus: 'pending' }),
    );

    const { outboxProcessor } = await import('@/shared/lib/sync/OutboxProcessor');
    const result = await outboxProcessor.processAll();

    expect(result.stats.total).toBe(0);
    expect(result.stats.synced).toBe(0);
    expect(queueStore.get(fresh.id)?.status).toBe('processing');
    expect(queueStore.get(fresh.id)?.retryCount).toBe(1);
    expect(orders.get('order-stuck-1')?.orderSyncStatus).toBe('sending');
    expect(pushOrderToFirestore).not.toHaveBeenCalled();
  });

  it('heals order sending → pending_offline only for stale processing order row', async () => {
    const item = stuckQueueItem();
    queueStore.set(item.id, item);
    orders.set('order-stuck-1', baseOrder({ orderSyncStatus: 'sending' }));
    orderLines.set('order-stuck-1', []);

    const { outboxProcessor } = await import('@/shared/lib/sync/OutboxProcessor');
    await outboxProcessor.processAll();

    expect(updateSyncStatusCalls[0]).toEqual({
      id: 'order-stuck-1',
      orderSyncStatus: 'pending_offline',
      syncStatus: 'pending',
    });
    expect(orders.get('order-stuck-1')?.orderSyncStatus).toBe('sent');
  });

  it('does not change order status when stale processing is not an order', async () => {
    const branchItem = stuckQueueItem({
      id: 'queue-branch-1',
      entityType: 'branch',
      entityId: 'branch-1',
      idempotencyKey: 'branch:branch-1:create',
    });
    queueStore.set(branchItem.id, branchItem);
    orders.set(
      'order-unrelated',
      baseOrder({
        id: 'order-unrelated',
        orderSyncStatus: 'sending',
      }),
    );

    const { outboxProcessor } = await import('@/shared/lib/sync/OutboxProcessor');
    // Outbox is order-only: legacy master-data rows are dropped, not pushed.
    await outboxProcessor.processAll();

    expect(orders.get('order-unrelated')?.orderSyncStatus).toBe('sending');
    expect(queueStore.has('queue-branch-1')).toBe(false);
    expect(updateSyncStatusCalls).toHaveLength(0);
  });

  it('does not heal order that is already sent', async () => {
    const item = stuckQueueItem();
    queueStore.set(item.id, item);
    orders.set(
      'order-stuck-1',
      baseOrder({
        orderSyncStatus: 'sent',
        syncStatus: 'synced',
      }),
    );
    orderLines.set('order-stuck-1', []);

    const { outboxProcessor } = await import('@/shared/lib/sync/OutboxProcessor');
    await outboxProcessor.processAll();

    // Idempotency may skip because sent — order must stay sent (not downgraded by heal)
    expect(orders.get('order-stuck-1')?.orderSyncStatus).toBe('sent');
  });

  it('uses SYNC_CONFIG.processingLeaseMs for reclaim threshold', async () => {
    expect(SYNC_CONFIG.processingLeaseMs).toBe(120_000);

    const almostStale = stuckQueueItem({
      lastAttemptAt: new Date(
        Date.now() - SYNC_CONFIG.processingLeaseMs + 5_000,
      ).toISOString(),
    });
    queueStore.set(almostStale.id, almostStale);
    orders.set('order-stuck-1', baseOrder({ orderSyncStatus: 'sending' }));

    const { outboxProcessor } = await import('@/shared/lib/sync/OutboxProcessor');
    await outboxProcessor.processAll();

    expect(queueStore.get(almostStale.id)?.status).toBe('processing');
    expect(orders.get('order-stuck-1')?.orderSyncStatus).toBe('sending');
  });
});
