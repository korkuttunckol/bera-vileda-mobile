import { v4 as uuidv4 } from 'uuid';
import { isFirebaseConfigured } from '@/config/env';
import { syncQueueRepository } from '@/shared/lib/indexeddb/repositories/syncQueueRepository';
import { META_KEYS, setMetaValue } from '@/shared/lib/indexeddb/db';
import { saveSyncLog } from '@/shared/lib/firebase/firestoreService';
import { outboxProcessor } from './OutboxProcessor';
import { pullSync } from './PullSync';
import { buildSyncReport, saveAndNotifySyncReport } from './syncReportBuilder';
import type {
  SyncReport,
  SyncResult,
  SyncTrigger,
  SyncNowOptions,
} from './types/sync.types';

export interface ISyncEngine {
  start(): void;
  stop(): void;
  syncNow(trigger?: SyncTrigger, options?: SyncNowOptions): Promise<SyncResult>;
  getPendingCount(): Promise<number>;
}

type SyncListener = (report: SyncReport) => void;

export class SyncEngine implements ISyncEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onlineHandler: (() => void) | null = null;
  private activeSync: Promise<SyncResult> | null = null;
  private listeners: SyncListener[] = [];

  start(): void {
    // Arka plan senkronizasyonu AppProviders üzerinden syncService ile yönetilir.
  }

  stop(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onReport(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  syncNow(
    trigger: SyncTrigger = 'manual',
    options: SyncNowOptions = {},
  ): Promise<SyncResult> {
    if (this.activeSync) {
      console.info('[SyncEngine] Devam eden senkronizasyon var, aynı işlem bekleniyor...');
      return this.activeSync;
    }

    this.activeSync = this.runSyncNow(trigger, options).finally(() => {
      this.activeSync = null;
    });

    return this.activeSync;
  }

  private async runSyncNow(
    trigger: SyncTrigger,
    options: SyncNowOptions,
  ): Promise<SyncResult> {
    const startedAt = new Date().toISOString();
    const errors: SyncReport['errors'] = [];
    let pullStats = { customers: 0, products: 0, users: 0, full: false };
    let pullSucceeded = true;
    let queueRun = {
      total: 0,
      synced: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
    };

    const shouldFullSync =
      options.forceFull === true ||
      options.full === true ||
      trigger === 'manual' ||
      (await pullSync.needsInitialSync());

    try {
      if (navigator.onLine) {
        const pushResult = await outboxProcessor.processAll();
        queueRun = pushResult.stats;
        errors.push(...pushResult.errors);
        if (isFirebaseConfigured()) {
          pullStats = await pullSync.pullAll({ full: shouldFullSync });
        }
      }
    } catch (err) {
      pullSucceeded = false;
      const errorId = uuidv4();
      const message = err instanceof Error ? err.message : 'Sync hatası';

      errors.push({
        entityType: 'sync',
        entityId: errorId,
        idempotencyKey: errorId,
        message,
        timestamp: new Date().toISOString(),
      });
      console.error('[SyncEngine] Synchronization failed:', message, err);
    }

    const report = await buildSyncReport({
      trigger,
      pull: pullStats,
      errors,
      startedAt,
    });

    const syncSuccessful =
      pullSucceeded &&
      errors.length === 0 &&
      (report.orders?.failed ?? 0) === 0;

    const finalReport: SyncReport = {
      ...report,
      success: syncSuccessful,
    };

    await saveAndNotifySyncReport(finalReport);

    if (navigator.onLine && syncSuccessful) {
      await setMetaValue(META_KEYS.LAST_SYNC_AT, finalReport.completedAt);
    }

    if (isFirebaseConfigured()) {
      await saveSyncLog({
        id: finalReport.id,
        push: { synced: queueRun.synced, failed: queueRun.failed },
        pull: {
          customers: pullStats.customers,
          products: pullStats.products,
          users: pullStats.users,
        },
        success: syncSuccessful,
        errors,
        startedAt,
        completedAt: finalReport.completedAt,
      });
    }

    if (syncSuccessful) {
      console.info('[SyncEngine] Synchronization completed');
    }

    this.listeners.forEach((l) => { l(finalReport); });

    return { success: syncSuccessful, report: finalReport };
  }

  async getPendingCount(): Promise<number> {
    return syncQueueRepository.countPending();
  }
}

export const syncEngine = new SyncEngine();
