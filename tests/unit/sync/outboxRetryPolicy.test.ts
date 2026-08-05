import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SYNC_CONFIG } from '@/config/app.config';
import { RetryPolicy } from '@/shared/lib/sync/RetryPolicy';
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

function failedItem(
  overrides: Partial<LocalSyncQueueItem> = {},
): LocalSyncQueueItem {
  return {
    id: 'queue-failed-1',
    entityType: 'order',
    entityId: 'order-fail-1',
    operation: 'create',
    idempotencyKey: 'order:order-fail-1:create',
    payload: JSON.stringify({ orderId: 'order-fail-1' }),
    retryCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastAttemptAt: new Date().toISOString(),
    status: 'failed',
    ...overrides,
  };
}

function seedOrder(): void {
  const now = '2026-01-01T00:00:00.000Z';
  orders.set('order-fail-1', {
    id: 'order-fail-1',
    localId: 'local-fail-1',
    customerId: 'cust-1',
    customerName: 'Test',
    customerCode: 'C001',
    salesRepId: 'rep-1',
    status: 'submitted',
    syncStatus: 'failed',
    orderSyncStatus: 'failed',
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
  });
  orderLines.set('order-fail-1', []);
}

describe('RetryPolicy eligibility', () => {
  const policy = new RetryPolicy();

  it('shouldRetry respects SYNC_CONFIG.maxRetries', () => {
    expect(policy.shouldRetry(0)).toBe(true);
    expect(policy.shouldRetry(SYNC_CONFIG.maxRetries - 1)).toBe(true);
    expect(policy.shouldRetry(SYNC_CONFIG.maxRetries)).toBe(false);
  });

  it('getDelayMs is exponential from SYNC_CONFIG.retryDelayMs', () => {
    expect(policy.getDelayMs(0)).toBe(SYNC_CONFIG.retryDelayMs);
    expect(policy.getDelayMs(1)).toBe(SYNC_CONFIG.retryDelayMs * 2);
    expect(policy.getDelayMs(2)).toBe(SYNC_CONFIG.retryDelayMs * 4);
  });

  it('isFailedRetryEligible waits backoff from lastAttemptAt', () => {
    const now = Date.parse('2026-06-01T12:00:10.000Z');
    const item = failedItem({
      retryCount: 1,
      lastAttemptAt: '2026-06-01T12:00:00.000Z',
    });
    // delay for retryCount-1=0 → 3000ms; eligible at 12:00:03
    expect(policy.isFailedRetryEligible(item, now)).toBe(true);
    expect(
      policy.isFailedRetryEligible(item, Date.parse('2026-06-01T12:00:02.000Z')),
    ).toBe(false);
  });

  it('exhausted retries are not eligible', () => {
    const item = failedItem({
      retryCount: SYNC_CONFIG.maxRetries,
      lastAttemptAt: '2020-01-01T00:00:00.000Z',
    });
    expect(policy.isFailedRetryEligible(item, Date.now())).toBe(false);
  });
});

describe('Outbox RetryPolicy wiring', () => {
  beforeEach(() => {
    queueStore.clear();
    processedKeys.clear();
    orders.clear();
    orderLines.clear();
    pushOrderToFirestore.mockClear();
    findOrderByLocalId.mockClear();
    findOrderByLocalId.mockResolvedValue(null);
    vi.resetModules();
  });

  it('skips failed item still inside backoff window', async () => {
    seedOrder();
    queueStore.set(
      'queue-failed-1',
      failedItem({
        retryCount: 1,
        lastAttemptAt: new Date().toISOString(),
      }),
    );

    const { outboxProcessor } = await import('@/shared/lib/sync/OutboxProcessor');
    const waitSpy = vi.spyOn(RetryPolicy.prototype, 'wait');

    const result = await outboxProcessor.processAll();

    expect(result.stats.total).toBe(0);
    expect(pushOrderToFirestore).not.toHaveBeenCalled();
    expect(waitSpy).not.toHaveBeenCalled();
    expect(queueStore.get('queue-failed-1')?.status).toBe('failed');
    waitSpy.mockRestore();
  });

  it('retries failed item after backoff elapsed', async () => {
    seedOrder();
    const elapsed = new Date(
      Date.now() - SYNC_CONFIG.retryDelayMs - 100,
    ).toISOString();
    queueStore.set(
      'queue-failed-1',
      failedItem({
        retryCount: 1,
        lastAttemptAt: elapsed,
      }),
    );

    const { outboxProcessor } = await import('@/shared/lib/sync/OutboxProcessor');
    const result = await outboxProcessor.processAll();

    expect(result.stats.synced).toBe(1);
    expect(pushOrderToFirestore).toHaveBeenCalledTimes(1);
    expect(queueStore.size).toBe(0);
  });

  it('does not auto-retry when retryCount >= maxRetries', async () => {
    seedOrder();
    queueStore.set(
      'queue-failed-1',
      failedItem({
        retryCount: SYNC_CONFIG.maxRetries,
        lastAttemptAt: '2020-01-01T00:00:00.000Z',
      }),
    );

    const { outboxProcessor } = await import('@/shared/lib/sync/OutboxProcessor');
    const result = await outboxProcessor.processAll();

    expect(result.stats.total).toBe(0);
    expect(pushOrderToFirestore).not.toHaveBeenCalled();
    expect(queueStore.get('queue-failed-1')?.status).toBe('failed');
    expect(queueStore.get('queue-failed-1')?.retryCount).toBe(
      SYNC_CONFIG.maxRetries,
    );
  });

  it('on push failure increments retryCount and marks failed without wait()', async () => {
    seedOrder();
    queueStore.set(
      'queue-failed-1',
      failedItem({
        status: 'pending',
        retryCount: 0,
        lastAttemptAt: undefined,
      }),
    );
    pushOrderToFirestore.mockRejectedValueOnce(new Error('offline'));

    const { outboxProcessor } = await import('@/shared/lib/sync/OutboxProcessor');
    const waitSpy = vi.spyOn(RetryPolicy.prototype, 'wait');

    const result = await outboxProcessor.processAll();

    expect(result.stats.failed).toBe(1);
    expect(queueStore.get('queue-failed-1')?.status).toBe('failed');
    expect(queueStore.get('queue-failed-1')?.retryCount).toBe(1);
    expect(waitSpy).not.toHaveBeenCalled();
    waitSpy.mockRestore();
  });
});
