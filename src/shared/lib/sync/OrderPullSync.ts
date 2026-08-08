import {
  pullAllOrders,
  pullOrderLines,
} from '@/shared/lib/firebase/firestoreService';
import { orderLocalRepository } from '@/shared/lib/indexeddb/repositories/orderRepository';
import type { Order } from '@/shared/types/order.types';
import type { SyncOrderPullStats } from './types/sync.types';

const PROTECTED_ORDER_SYNC_STATUSES = new Set([
  'pending_offline',
  'sending',
  'failed',
]);

function toRemoteSyncedOrder(remote: Order): Order {
  return {
    ...remote,
    orderSyncStatus: 'sent',
    syncStatus: 'synced',
    syncError: undefined,
  };
}

/**
 * Pull Firestore orders + lines into IndexedDB.
 * Merge key: Order.id (= Firestore document id). Idempotent put.
 * Does not overwrite local pending_offline / sending / failed rows.
 */
export async function pullAndMergeOrders(): Promise<SyncOrderPullStats> {
  const stats: SyncOrderPullStats = {
    pulled: 0,
    updated: 0,
    skipped: 0,
  };

  const remoteOrders = await pullAllOrders();
  console.info(`[Sync] ORDERS PULL START · remote=${String(remoteOrders.length)}`);

  for (const remote of remoteOrders) {
    const local = await orderLocalRepository.getById(remote.id);

    if (local && PROTECTED_ORDER_SYNC_STATUSES.has(local.orderSyncStatus)) {
      stats.skipped += 1;
      continue;
    }

    const lines = await pullOrderLines(remote.id);
    const merged = toRemoteSyncedOrder(remote);
    await orderLocalRepository.replaceWithLines(merged, lines);

    stats.pulled += 1;
    if (local) {
      stats.updated += 1;
    }
  }

  console.info(
    `[Sync] ORDERS PULL END · pulled=${String(stats.pulled)} updated=${String(stats.updated)} skipped=${String(stats.skipped)}`,
  );

  return stats;
}

export const orderPullSync = {
  pullAndMerge: pullAndMergeOrders,
};
