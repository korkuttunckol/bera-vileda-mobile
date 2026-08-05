import { SYNC_CONFIG } from '@/config/app.config';
import type { LocalSyncQueueItem } from '@/shared/lib/indexeddb/db';

export class RetryPolicy {
  shouldRetry(retryCount: number): boolean {
    return retryCount < SYNC_CONFIG.maxRetries;
  }

  getDelayMs(retryCount: number): number {
    return SYNC_CONFIG.retryDelayMs * Math.pow(2, retryCount);
  }

  /**
   * Non-blocking eligibility: failed item may re-enter processAll only after
   * exponential backoff from lastAttemptAt (delay index = retryCount - 1).
   */
  isFailedRetryEligible(item: LocalSyncQueueItem, nowMs: number): boolean {
    if (item.status !== 'failed') return false;
    if (!this.shouldRetry(item.retryCount)) return false;
    if (!item.lastAttemptAt) return true;

    const delayMs = this.getDelayMs(Math.max(0, item.retryCount - 1));
    const eligibleAt = Date.parse(item.lastAttemptAt) + delayMs;
    return nowMs >= eligibleAt;
  }

  async wait(retryCount: number): Promise<void> {
    const delay = this.getDelayMs(retryCount);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export const retryPolicy = new RetryPolicy();
