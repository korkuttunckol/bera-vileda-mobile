import { v4 as uuidv4 } from 'uuid';
import { syncEngine } from '@/shared/lib/sync/SyncEngine';
import { outboxProcessor } from '@/shared/lib/sync/OutboxProcessor';
import { orderLocalRepository } from '@/shared/lib/indexeddb/repositories/orderRepository';
import { syncQueueRepository } from '@/shared/lib/indexeddb/repositories/syncQueueRepository';
import { syncReportRepository } from '@/shared/lib/indexeddb/repositories/syncReportRepository';
import {
  publishOrderSyncReport,
} from '@/shared/lib/sync/syncReportBuilder';
import { computeOrderSyncStats } from '@/shared/lib/sync/orderSyncStats';
import { useSyncStore } from '@/stores/syncStore';
import { useOfflineStore } from '@/stores/offlineStore';
import type { Order, OrderLine } from '@/shared/types/order.types';
import type { SyncTrigger, SyncResult } from '@/shared/lib/sync/types/sync.types';

class SyncService {
  async refreshPendingCount(): Promise<number> {
    const count = await syncQueueRepository.countPending();
    useOfflineStore.getState().setPendingSyncCount(count);
    useSyncStore.getState().setPendingCount(count);
    return count;
  }

  async loadLastReport(): Promise<void> {
    const existing = await syncReportRepository.getLatest();
    if (existing && !existing.orders) {
      const fresh = await publishOrderSyncReport('auto');
      useSyncStore.getState().setLastReport(fresh);
      return;
    }

    if (existing) {
      const allOrders = await orderLocalRepository.getAll();
      const orders = computeOrderSyncStats(allOrders);
      useSyncStore.getState().setLastReport({
        ...existing,
        orders: {
          sent: orders.sent,
          pending: orders.pending,
          failed: orders.failed,
          sending: orders.sending,
        },
        push: {
          total: orders.sent,
          synced: orders.sent,
          failed: orders.failed,
          skipped: 0,
          pending: orders.pending + orders.sending,
        },
      });
      return;
    }

    const fresh = await publishOrderSyncReport('auto');
    useSyncStore.getState().setLastReport(fresh);
  }

  async publishOrderSyncReport(trigger: SyncTrigger = 'auto'): Promise<void> {
    const report = await publishOrderSyncReport(trigger);
    useSyncStore.getState().setLastReport(report);
  }

  async syncNow(trigger: SyncTrigger = 'manual'): Promise<SyncResult> {
    useSyncStore.getState().setSyncing(true);
    try {
      const result = await syncEngine.syncNow(trigger);
      await this.refreshPendingCount();
      return result;
    } finally {
      useSyncStore.getState().setSyncing(false);
    }
  }

  notifyDataChanged(): void {
    useSyncStore.getState().bumpDataRevision();
  }

  async enqueueOrder(order: Order, lines: OrderLine[]): Promise<void> {
    await orderLocalRepository.saveWithLines(order, lines);
    await outboxProcessor.enqueue({
      entityType: 'order',
      entityId: order.id,
      operation: 'create',
      data: { orderId: order.id, localId: order.localId },
    });
    await this.refreshPendingCount();
  }

  createLocalOrderId(): string {
    return uuidv4();
  }
}

export const syncService = new SyncService();
