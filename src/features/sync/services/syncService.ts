import { v4 as uuidv4 } from 'uuid';
import { syncEngine } from '@/shared/lib/sync/SyncEngine';
import { pullSync } from '@/shared/lib/sync/PullSync';
import { outboxProcessor } from '@/shared/lib/sync/OutboxProcessor';
import {
  orderLocalRepository,
  countPendingOrders,
} from '@/shared/lib/indexeddb/repositories/orderRepository';
import { syncReportRepository } from '@/shared/lib/indexeddb/repositories/syncReportRepository';
import { getMetaValue, META_KEYS, setMetaValue } from '@/shared/lib/indexeddb/db';
import {
  publishOrderSyncReport,
} from '@/shared/lib/sync/syncReportBuilder';
import { computeOrderSyncStats } from '@/shared/lib/sync/orderSyncStats';
import { useSyncStore } from '@/stores/syncStore';
import { useOfflineStore } from '@/stores/offlineStore';
import { dataStatsService } from '@/features/sync/services/dataStatsService';
import type { Order, OrderLine } from '@/shared/types/order.types';
import type { SyncTrigger, SyncResult } from '@/shared/lib/sync/types/sync.types';
import type { EntityDataSource } from '@/shared/lib/sync/dataSource.types';

class SyncService {
  async refreshPendingCount(): Promise<number> {
    const allOrders = await orderLocalRepository.getAll();
    const count = countPendingOrders(allOrders);
    useOfflineStore.getState().setPendingSyncCount(count);
    useSyncStore.getState().setPendingCount(count);
    return count;
  }

  async refreshDataStats(): Promise<void> {
    const stats = await dataStatsService.getStats();
    useSyncStore.getState().setDataStats(stats);
  }

  async loadDataSourcesFromMeta(): Promise<void> {
    const sources = await dataStatsService.getDataSources();
    useSyncStore.getState().setDataSources(sources);
  }

  async loadLastReport(): Promise<void> {
    const lastSyncAt = await getMetaValue(META_KEYS.LAST_SYNC_AT);
    useSyncStore.getState().setLastSyncAt(lastSyncAt ?? null);

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
      const needsFull = trigger === 'manual' || (await pullSync.needsInitialSync());
      const result = await syncEngine.syncNow(trigger, { full: needsFull });
      await this.refreshPendingCount();
      await this.refreshDataStats();

      const lastSyncAt = await getMetaValue(META_KEYS.LAST_SYNC_AT);
      useSyncStore.getState().setLastSyncAt(lastSyncAt ?? null);

      const pulledTotal =
        result.report.pull.customers +
        result.report.pull.products +
        result.report.pull.users;

      if (result.success && pulledTotal > 0) {
        useSyncStore.getState().setHasRemoteUpdates(true);
      }

      if (result.success && navigator.onLine) {
        await this.markIndexedDbSourcesFromFirestore();
      } else if (!navigator.onLine) {
        await this.markOfflineSources();
      }

      return result;
    } finally {
      useSyncStore.getState().setSyncing(false);
    }
  }

  private async markIndexedDbSourcesFromFirestore(): Promise<void> {
    await Promise.all([
      setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore'),
      setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore'),
      setMetaValue(META_KEYS.DATA_SOURCE_USERS, 'firestore'),
    ]);
    await this.refreshDataStats();
  }

  private async markOfflineSources(): Promise<void> {
    const mark = async (key: string): Promise<void> => {
      const current = await getMetaValue(key);
      if (current !== 'firestore') {
        await setMetaValue(key, 'indexeddb');
      }
    };

    await Promise.all([
      mark(META_KEYS.DATA_SOURCE_CUSTOMERS),
      mark(META_KEYS.DATA_SOURCE_PRODUCTS),
      mark(META_KEYS.DATA_SOURCE_USERS),
    ]);
    await this.refreshDataStats();
  }

  notifyDataChanged(): void {
    useSyncStore.getState().bumpDataRevision();
    void this.refreshDataStats();
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

  getSourceLabel(source: EntityDataSource): string {
    switch (source) {
      case 'firestore':
        return 'Firestore → IndexedDB';
      case 'localStorage':
        return 'LocalStorage';
      default:
        return 'IndexedDB';
    }
  }
}

export const syncService = new SyncService();
