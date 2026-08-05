import { v4 as uuidv4 } from 'uuid';
import { SYNC_CONFIG } from '@/config/app.config';
import { syncQueueRepository } from '@/shared/lib/indexeddb/repositories/syncQueueRepository';
import { orderLocalRepository } from '@/shared/lib/indexeddb/repositories/orderRepository';
import type { LocalSyncQueueItem } from '@/shared/lib/indexeddb/db';
import { pushSync } from './PushSync';
import { buildIdempotencyKey } from './IdempotencyGuard';
import { retryPolicy } from './RetryPolicy';
import type {
  SyncPushStats,
  SyncReportError,
  SyncQueuePayload,
} from './types/sync.types';

interface ProcessItemResult {
  outcome: 'synced' | 'skipped' | 'failed';
  error?: SyncReportError;
}

export class OutboxProcessor {
  async processAll(): Promise<{
    stats: SyncPushStats;
    errors: SyncReportError[];
  }> {
    const stats: SyncPushStats = {
      total: 0,
      synced: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
    };
    const errors: SyncReportError[] = [];

    await this.reclaimStuckProcessing();

    const nowMs = Date.now();
    const pending = await syncQueueRepository.getPending();
    const failed = await syncQueueRepository.getFailed();
    const retryableFailed = failed.filter((item) =>
      retryPolicy.isFailedRetryEligible(item, nowMs),
    );
    const items = [...pending, ...retryableFailed];
    stats.total = items.length;

    for (const item of items) {
      const itemStartedAt = Date.now();
      console.info(`[Sync] OUTBOX ITEM START ${item.entityType}/${item.entityId}`);
      const result = await this.processItem(item);
      console.info(
        `[Sync] OUTBOX ITEM END ${item.entityType}/${item.entityId} · ${result.outcome} (${String(Date.now() - itemStartedAt)} ms)`,
      );
      stats[result.outcome]++;
      if (result.error) errors.push(result.error);
    }

    return { stats, errors };
  }

  async enqueue(payload: SyncQueuePayload): Promise<void> {
    const idempotencyKey = buildIdempotencyKey(
      payload.entityType,
      payload.entityId,
      payload.operation,
    );

    const item: LocalSyncQueueItem = {
      id: uuidv4(),
      entityType: payload.entityType,
      entityId: payload.entityId,
      operation: payload.operation,
      idempotencyKey,
      payload: JSON.stringify(payload.data),
      retryCount: 0,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    await syncQueueRepository.enqueue(item);
  }

  /**
   * Crash / tab-kill recovery: stale `processing` → `pending` (retryCount preserved).
   * Order heal runs only for those same stale processing rows.
   */
  private async reclaimStuckProcessing(): Promise<void> {
    const stuck = await syncQueueRepository.findStuckProcessing(
      SYNC_CONFIG.processingLeaseMs,
    );

    for (const item of stuck) {
      await this.healOrderIfStuckProcessing(item);
      await syncQueueRepository.resetToPending(item.id, item.retryCount);
    }
  }

  /**
   * Only for a stale `processing` order queue row already selected by reclaim.
   * Never changes order status in any other case.
   */
  private async healOrderIfStuckProcessing(
    stuckItem: LocalSyncQueueItem,
  ): Promise<void> {
    if (stuckItem.entityType !== 'order') return;
    if (stuckItem.status !== 'processing') return;

    const order = await orderLocalRepository.getById(stuckItem.entityId);
    if (!order || order.orderSyncStatus !== 'sending') return;

    await orderLocalRepository.updateSyncStatus(
      order.id,
      'pending_offline',
      'pending',
    );
  }

  private async processItem(item: LocalSyncQueueItem): Promise<ProcessItemResult> {
    // Kilit: item processing olur. IdempotencyGuard currentQueueItemId ile
    // bu kaydı self-skip etmez; yalnızca başka processing çakışmasında skip eder.
    await syncQueueRepository.markProcessing(item.id);

    const result = await pushSync.pushItem(item);

    if (result.status === 'synced') {
      await syncQueueRepository.remove(item.id);
      return { outcome: 'synced' };
    }

    if (result.status === 'skipped') {
      await syncQueueRepository.remove(item.id);
      return { outcome: 'skipped' };
    }

    const newRetryCount = item.retryCount + 1;
    await syncQueueRepository.markFailed(item.id, newRetryCount);

    return { outcome: 'failed', error: result.error };
  }
}

export const outboxProcessor = new OutboxProcessor();
