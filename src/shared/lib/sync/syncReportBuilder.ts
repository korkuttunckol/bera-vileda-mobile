import { v4 as uuidv4 } from 'uuid';
import { orderLocalRepository } from '@/shared/lib/indexeddb/repositories/orderRepository';
import { syncReportRepository } from '@/shared/lib/indexeddb/repositories/syncReportRepository';
import { setMetaValue, META_KEYS } from '@/shared/lib/indexeddb/db';
import { computeOrderSyncStats } from '@/shared/lib/sync/orderSyncStats';
import type {
  SyncOrderStats,
  SyncPullStats,
  SyncPushStats,
  SyncReport,
  SyncReportError,
  SyncTrigger,
} from '@/shared/lib/sync/types/sync.types';

interface BuildSyncReportParams {
  trigger: SyncTrigger;
  pull?: SyncPullStats;
  errors?: SyncReportError[];
  startedAt?: string;
  queueRun?: SyncPushStats;
}

function toSyncOrderStats(stats: ReturnType<typeof computeOrderSyncStats>): SyncOrderStats {
  return {
    sent: stats.sent,
    pending: stats.pending,
    failed: stats.failed,
    sending: stats.sending,
  };
}

function orderStatsToPushStats(orders: SyncOrderStats): SyncPushStats {
  return {
    total: orders.sent,
    synced: orders.sent,
    failed: orders.failed,
    skipped: 0,
    pending: orders.pending + orders.sending,
  };
}

export async function buildSyncReport({
  trigger,
  pull,
  errors = [],
  startedAt = new Date().toISOString(),
}: BuildSyncReportParams): Promise<SyncReport> {
  const allOrders = await orderLocalRepository.getAll();
  const orders = toSyncOrderStats(computeOrderSyncStats(allOrders));
  const completedAt = new Date().toISOString();

  return {
    id: uuidv4(),
    startedAt,
    completedAt,
    durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    trigger,
    push: orderStatsToPushStats(orders),
    pull: pull ?? { customers: 0, products: 0, users: 0 },
    orders,
    errors,
    success: errors.length === 0 && orders.failed === 0,
  };
}

export async function saveAndNotifySyncReport(report: SyncReport): Promise<SyncReport> {
  await syncReportRepository.save(report);
  await setMetaValue(META_KEYS.LAST_SYNC_REPORT_ID, report.id);
  return report;
}

export async function publishOrderSyncReport(
  trigger: SyncTrigger = 'auto',
): Promise<SyncReport> {
  return saveAndNotifySyncReport(await buildSyncReport({ trigger }));
}
