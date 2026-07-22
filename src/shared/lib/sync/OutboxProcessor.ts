import { v4 as uuidv4 } from 'uuid';
import { syncQueueRepository } from '@/shared/lib/indexeddb/repositories/syncQueueRepository';
import { pushSync } from './PushSync';
import { retryPolicy } from './RetryPolicy';
import { buildIdempotencyKey } from './IdempotencyGuard';
import type { LocalSyncQueueItem } from '@/shared/lib/indexeddb/db';
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

    const pending = await syncQueueRepository.getPending();
    const failed = await syncQueueRepository.getFailed();
    const items = [...pending, ...failed];
    stats.total = items.length;

    for (const item of items) {
      const result = await this.processItem(item);
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

  private async processItem(item: LocalSyncQueueItem): Promise<ProcessItemResult> {
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
    if (retryPolicy.shouldRetry(newRetryCount)) {
      await retryPolicy.wait(newRetryCount);
      await syncQueueRepository.resetToPending(item.id, newRetryCount);
    } else {
      await syncQueueRepository.markFailed(item.id, newRetryCount);
    }

    return { outcome: 'failed', error: result.error };
  }
}

export const outboxProcessor = new OutboxProcessor();
