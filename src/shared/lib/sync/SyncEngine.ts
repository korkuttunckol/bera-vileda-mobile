import { v4 as uuidv4 } from 'uuid';
import { isFirebaseConfigured } from '@/config/env';
import { syncQueueRepository } from '@/shared/lib/indexeddb/repositories/syncQueueRepository';
import { META_KEYS, setMetaValue } from '@/shared/lib/indexeddb/db';
import { saveSyncLog } from '@/shared/lib/firebase/firestoreService';
import { outboxProcessor } from './OutboxProcessor';
import { pullSync } from './PullSync';
import { buildSyncReport, saveAndNotifySyncReport } from './syncReportBuilder';
import { logSyncFailed } from './syncPullLogger';
import type {
  SyncReport,
  SyncResult,
  SyncTrigger,
  SyncNowOptions,
} from './types/sync.types';

/** Online flapping'de çoklu sync engeli (ms). */
export const ONLINE_RECONNECT_DEBOUNCE_MS = 1_500;

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
  private onlineReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private activeSync: Promise<SyncResult> | null = null;
  private listeners: SyncListener[] = [];

  start(): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (this.onlineHandler) {
      return;
    }

    this.onlineHandler = () => {
      this.scheduleOnlineReconnect();
    };
    window.addEventListener('online', this.onlineHandler);
  }

  stop(): void {
    if (this.onlineReconnectTimer !== null) {
      clearTimeout(this.onlineReconnectTimer);
      this.onlineReconnectTimer = null;
    }
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private scheduleOnlineReconnect(): void {
    if (this.onlineReconnectTimer !== null) {
      clearTimeout(this.onlineReconnectTimer);
    }
    this.onlineReconnectTimer = setTimeout(() => {
      this.onlineReconnectTimer = null;
      void this.syncNow('online_reconnect');
    }, ONLINE_RECONNECT_DEBOUNCE_MS);
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
      console.info('[Sync] SYNC SKIP — engine: devam eden işlem var');
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
    console.info(`[Sync] engine start (trigger=${trigger}, getDocs only — onSnapshot yok)`);

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

    console.info(`[Sync] mode=${shouldFullSync ? 'full' : 'incremental'}`);

    try {
      if (navigator.onLine) {
        if (isFirebaseConfigured()) {
          pullStats = await pullSync.pullAll({ full: shouldFullSync });
        }

        // Tüm trigger'larda (auto dahil) outbox bitmeden report/activeSync tamamlanmaz.
        console.info('[Sync] OUTBOX PUSH START');
        const outboxStartedAt = Date.now();
        const pushResult = await outboxProcessor.processAll();
        queueRun = pushResult.stats;
        errors.push(...pushResult.errors);
        console.info(
          `[Sync] OUTBOX PUSH END (${String(Date.now() - outboxStartedAt)} ms) · synced=${String(queueRun.synced)} failed=${String(queueRun.failed)}`,
        );
      } else {
        console.info('[Sync] Çevrimdışı — Firestore adımları atlandı');
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
      logSyncFailed(err);
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

    if (navigator.onLine && pullSucceeded) {
      await setMetaValue(META_KEYS.LAST_SYNC_AT, finalReport.completedAt);
    }

    if (isFirebaseConfigured()) {
      void saveSyncLog({
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
      }).catch((error: unknown) => {
        console.warn('[Sync] Sync log write failed:', error);
      });
    }

    this.listeners.forEach((l) => { l(finalReport); });

    console.info(`[Sync] engine complete success=${String(syncSuccessful)} pull=${String(pullSucceeded)}`);

    return { success: syncSuccessful, report: finalReport };
  }

  async getPendingCount(): Promise<number> {
    return syncQueueRepository.countPending();
  }
}

export const syncEngine = new SyncEngine();
