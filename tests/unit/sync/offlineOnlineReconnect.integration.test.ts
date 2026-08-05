import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalSyncQueueItem } from '@/shared/lib/indexeddb/db';
import type { Order, OrderLine } from '@/shared/types/order.types';
import type { SyncReport } from '@/shared/lib/sync/types/sync.types';

const queueStore = new Map<string, LocalSyncQueueItem>();
const processedKeys = new Set<string>();
const orders = new Map<string, Order>();
const orderLines = new Map<string, OrderLine[]>();
const meta = new Map<string, string>();

const pushOrderToFirestore = vi.fn(async () => undefined);
const findOrderByLocalId = vi.fn(async (): Promise<Order | null> => null);
const saveSyncLog = vi.fn(async () => undefined);
const pullAll = vi.fn(async () => ({
  customers: 0,
  products: 0,
  users: 0,
  full: false,
}));
const needsInitialSync = vi.fn(async () => false);

let lastSavedReport: SyncReport | null = null;

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
  getMetaValue: async (key: string) => meta.get(key),
  setMetaValue: async (key: string, value: string) => {
    meta.set(key, value);
  },
  META_KEYS: {
    PROCESSED_PREFIX: 'processed:',
    LAST_SYNC_AT: 'lastSyncAt',
    LAST_SYNC_REPORT_ID: 'lastSyncReportId',
  },
}));

vi.mock('@/shared/lib/firebase/firestoreService', () => ({
  pushOrderToFirestore: (order: Order, lines: OrderLine[]) =>
    pushOrderToFirestore(order, lines),
  findOrderByLocalId: (localId: string) => findOrderByLocalId(localId),
  pushCustomerToFirestore: vi.fn(),
  pushBranchToFirestore: vi.fn(),
  saveSyncLog: (payload: unknown) => saveSyncLog(payload),
}));

vi.mock('@/shared/lib/sync/PullSync', () => ({
  pullSync: {
    pullAll: (...args: [{ full?: boolean }?]) => pullAll(...args),
    needsInitialSync: () => needsInitialSync(),
  },
}));

vi.mock('@/shared/lib/sync/syncPullLogger', () => ({
  logSyncFailed: vi.fn(),
}));

vi.mock('@/shared/lib/indexeddb/repositories/syncReportRepository', () => ({
  syncReportRepository: {
    async save(report: SyncReport) {
      lastSavedReport = report;
    },
    async getLatest() {
      return lastSavedReport;
    },
  },
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
    async remove(id: string) {
      queueStore.delete(id);
    },
    async countPending() {
      return [...queueStore.values()].filter((row) =>
        row.status === 'pending' || row.status === 'failed',
      ).length;
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
    async getAll() {
      return [...orders.values()];
    },
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

function seedOfflineOrder(orderId: string): Order {
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
    createdOffline: true,
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

function setNavigatorOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => online,
  });
}

describe('Integration: offline order → online_reconnect → Firestore', () => {
  beforeEach(() => {
    queueStore.clear();
    processedKeys.clear();
    orders.clear();
    orderLines.clear();
    meta.clear();
    lastSavedReport = null;
    pushOrderToFirestore.mockClear();
    findOrderByLocalId.mockClear();
    findOrderByLocalId.mockResolvedValue(null);
    saveSyncLog.mockClear();
    pullAll.mockClear();
    needsInitialSync.mockClear();
    needsInitialSync.mockResolvedValue(false);
    setNavigatorOnline(true);
    vi.resetModules();
  });

  it('offline create → online_reconnect → pushOrderToFirestore → queue empty → order sent', async () => {
    setNavigatorOnline(false);

    const { outboxProcessor } = await import(
      '@/shared/lib/sync/OutboxProcessor'
    );
    const { syncEngine } = await import('@/shared/lib/sync/SyncEngine');

    const orderId = 'order-offline-1';
    seedOfflineOrder(orderId);

    await outboxProcessor.enqueue({
      entityType: 'order',
      entityId: orderId,
      operation: 'create',
      data: { orderId, localId: `local-${orderId}` },
    });

    expect(queueStore.size).toBe(1);
    expect(orders.get(orderId)?.orderSyncStatus).toBe('pending_offline');

    // Offline iken sync Firestore adımlarını atlar; kuyruk beklemeye devam eder.
    const offlineResult = await syncEngine.syncNow('auto');
    expect(pushOrderToFirestore).not.toHaveBeenCalled();
    expect(queueStore.size).toBe(1);
    expect(offlineResult.report.trigger).toBe('auto');

    setNavigatorOnline(true);

    const onlineResult = await syncEngine.syncNow('online_reconnect');

    expect(pushOrderToFirestore).toHaveBeenCalledTimes(1);
    expect(pushOrderToFirestore).toHaveBeenCalledWith(
      expect.objectContaining({ id: orderId }),
      expect.arrayContaining([
        expect.objectContaining({ productSku: 'SKU-1', quantity: 2 }),
      ]),
    );

    expect(queueStore.size).toBe(0);
    expect(orders.get(orderId)?.orderSyncStatus).toBe('sent');
    expect(orders.get(orderId)?.syncStatus).toBe('synced');

    expect(onlineResult.report.trigger).toBe('online_reconnect');
    expect(lastSavedReport).not.toBeNull();
    expect(lastSavedReport?.trigger).toBe('online_reconnect');
    const reconnectLogCall = saveSyncLog.mock.calls.at(-1)?.[0] as {
      push: { synced: number; failed: number };
    };
    expect(reconnectLogCall.push.synced).toBe(1);
    expect(reconnectLogCall.push.failed).toBe(0);
  });

  it('auto sync awaits processAll so queueRun is reported before completion', async () => {
    setNavigatorOnline(true);

    const { outboxProcessor } = await import(
      '@/shared/lib/sync/OutboxProcessor'
    );
    const { syncEngine } = await import('@/shared/lib/sync/SyncEngine');

    const orderId = 'order-auto-1';
    seedOfflineOrder(orderId);

    await outboxProcessor.enqueue({
      entityType: 'order',
      entityId: orderId,
      operation: 'create',
      data: { orderId, localId: `local-${orderId}` },
    });

    const result = await syncEngine.syncNow('auto');

    expect(pushOrderToFirestore).toHaveBeenCalledTimes(1);
    expect(queueStore.size).toBe(0);
    expect(orders.get(orderId)?.orderSyncStatus).toBe('sent');
    expect(result.report.trigger).toBe('auto');
    expect(lastSavedReport).not.toBeNull();
    // Eski fire-and-forget yolda queueRun hep 0 kalırdı; await sonrası gerçek push stats yazılır.
    const autoLog = saveSyncLog.mock.calls.at(-1)?.[0] as {
      push: { synced: number; failed: number };
      success: boolean;
    };
    expect(autoLog.push.synced).toBe(1);
    expect(autoLog.push.failed).toBe(0);
    expect(autoLog.success).toBe(true);
  });
});
