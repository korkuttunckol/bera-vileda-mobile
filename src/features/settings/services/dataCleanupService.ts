import { db } from '@/shared/lib/indexeddb/db';
import { loadDisplayPreferences, saveDisplayPreferences } from '@/shared/lib/indexeddb/displayPreferencesStorage';
import { loadOrderSettings, saveOrderSettings } from '@/shared/lib/indexeddb/orderSettingsStorage';
import { syncService } from '@/features/sync/services/syncService';
import { useSyncStore } from '@/stores/syncStore';

class DataCleanupService {
  async clearOrderData(): Promise<number> {
    const orderCount = await db.orders.count();

    await db.transaction('rw', [db.orders, db.orderLines, db.syncQueue], async () => {
      const orderQueueItems = await db.syncQueue
        .where('entityType')
        .equals('order')
        .toArray();

      await db.orders.clear();
      await db.orderLines.clear();

      if (orderQueueItems.length > 0) {
        await db.syncQueue.bulkDelete(orderQueueItems.map((i) => i.id));
      }
    });

    await syncService.refreshPendingCount();
    return orderCount;
  }

  async clearAllLocalData(): Promise<void> {
    const [displayPrefs, orderSettings] = await Promise.all([
      loadDisplayPreferences(),
      loadOrderSettings(),
    ]);

    await db.transaction(
      'rw',
      [
        db.meta,
        db.syncQueue,
        db.syncReports,
        db.importLogs,
        db.orders,
        db.orderLines,
        db.customers,
        db.branches,
        db.products,
        db.users,
      ],
      async () => {
        await Promise.all([
          db.syncQueue.clear(),
          db.syncReports.clear(),
          db.importLogs.clear(),
          db.orders.clear(),
          db.orderLines.clear(),
          db.customers.clear(),
          db.branches.clear(),
          db.products.clear(),
          db.users.clear(),
          db.meta.clear(),
        ]);
      },
    );

    await Promise.all([
      saveDisplayPreferences(displayPrefs),
      saveOrderSettings(orderSettings),
    ]);

    await syncService.refreshPendingCount();
    useSyncStore.getState().setLastReport(null);
  }
}

export const dataCleanupService = new DataCleanupService();
