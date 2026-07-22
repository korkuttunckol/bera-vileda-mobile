import { SYNC_CONFIG } from '@/config/app.config';

export class RetryPolicy {
  shouldRetry(retryCount: number): boolean {
    return retryCount < SYNC_CONFIG.maxRetries;
  }

  getDelayMs(retryCount: number): number {
    return SYNC_CONFIG.retryDelayMs * Math.pow(2, retryCount);
  }

  async wait(retryCount: number): Promise<void> {
    const delay = this.getDelayMs(retryCount);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export const retryPolicy = new RetryPolicy();
