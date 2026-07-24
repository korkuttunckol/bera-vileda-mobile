import { v4 as uuidv4 } from 'uuid';
import { isFirebaseConfigured } from '@/config/env';
import { syncQueueRepository } from '@/shared/lib/indexeddb/repositories/syncQueueRepository';
import { syncReportRepository } from '@/shared/lib/indexeddb/repositories/syncReportRepository';
import { META_KEYS, setMetaValue } from '@/shared/lib/indexeddb/db';
import { saveSyncLog } from '@/shared/lib/firebase/firestoreService';
import { outboxProcessor } from './OutboxProcessor';
import { pullSync } from './PullSync';
import { buildSyncReport, saveAndNotifySyncReport } from './syncReportBuilder';
import type {
  SyncReport,
  SyncResult,
  SyncTrigger,
} from './types/sync.types';

export interface ISyncEngine {
  start(): void;
  stop(): void;
  syncNow(trigger?: SyncTrigger): Promise<SyncResult>;
  getPendingCount(): Promise<number>;
}

type SyncListener = (report: SyncReport) => void;

export class SyncEngine implements ISyncEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onlineHandler: (() => void) | null = null;
  private isSyncing = false;
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

  async syncNow(trigger: SyncTrigger = 'manual'): Promise<SyncResult> {
    if (this.isSyncing) {
      const latest = await syncReportRepository.getLatest();
      if (latest) {
        return { success: latest.success, report: latest };
      }
    }

    this.isSyncing = true;
    const startedAt = new Date().toISOString();
    const errors: SyncReport['errors'] = [];
    let pullStats = { customers: 0, products: 0 };
    let queueRun = {
      total: 0,
      synced: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
    };

    try {
      if (navigator.onLine) {
        const pushResult = await outboxProcessor.processAll();
        queueRun = pushResult.stats;
        errors.push(...pushResult.errors);
        if (isFirebaseConfigured()) {
          pullStats = await pullSync.pullAll();
        }
      }
    } catch (err) {
      const errorId = uuidv4();
      errors.push({
        entityType: 'sync',
        entityId: errorId,
        idempotencyKey: errorId,
        message: err instanceof Error ? err.message : 'Sync hatası',
        timestamp: new Date().toISOString(),
      });
    }

    const report = await buildSyncReport({
      trigger,
      pull: pullStats,
      errors,
      startedAt,
    });

    await saveAndNotifySyncReport(report);

    if (navigator.onLine && report.success) {
      await setMetaValue(META_KEYS.LAST_SYNC_AT, report.completedAt);
    }

    if (isFirebaseConfigured()) {
      await saveSyncLog({
        id: report.id,
        push: { synced: queueRun.synced, failed: queueRun.failed },
        pull: pullStats,
        success: report.success,
        errors,
        startedAt,
        completedAt: report.completedAt,
      });
    }

    this.listeners.forEach((l) => { l(report); });
    this.isSyncing = false;

    return { success: report.success, report };
  }

  async getPendingCount(): Promise<number> {
    return syncQueueRepository.countPending();
  }
}

export const syncEngine = new SyncEngine();
