import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncResult } from '@/shared/lib/sync/types/sync.types';

const processAll = vi.fn(async () => ({
  stats: { total: 0, synced: 0, failed: 0, skipped: 0, pending: 0 },
  errors: [] as [],
}));
const pullAll = vi.fn(async () => ({
  customers: 0,
  products: 0,
  users: 0,
  full: false,
}));
const needsInitialSync = vi.fn(async () => false);

vi.mock('@/config/env', () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock('@/shared/lib/sync/OutboxProcessor', () => ({
  outboxProcessor: {
    processAll: () => processAll(),
  },
}));

vi.mock('@/shared/lib/sync/PullSync', () => ({
  pullSync: {
    pullAll: (...args: [{ full?: boolean }?]) => pullAll(...args),
    needsInitialSync: () => needsInitialSync(),
  },
}));

vi.mock('@/shared/lib/sync/syncPullLogger', () => ({
  logSyncFailed: vi.fn(),
}));

vi.mock('@/shared/lib/sync/syncReportBuilder', () => ({
  buildSyncReport: vi.fn(async ({ trigger }: { trigger: string }) => ({
    id: 'report-1',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 0,
    trigger,
    push: { total: 0, synced: 0, failed: 0, skipped: 0, pending: 0 },
    pull: { customers: 0, products: 0, users: 0, full: false },
    orders: { sent: 0, pending: 0, failed: 0, sending: 0 },
    errors: [],
    success: true,
  })),
  saveAndNotifySyncReport: vi.fn(async (report: SyncResult['report']) => report),
}));

vi.mock('@/shared/lib/firebase/firestoreService', () => ({
  saveSyncLog: vi.fn(async () => undefined),
}));

vi.mock('@/shared/lib/indexeddb/db', () => ({
  setMetaValue: vi.fn(async () => undefined),
  META_KEYS: { LAST_SYNC_AT: 'lastSyncAt' },
}));

vi.mock('@/shared/lib/indexeddb/repositories/syncQueueRepository', () => ({
  syncQueueRepository: {
    countPending: vi.fn(async () => 0),
  },
}));

function installWindowStub(): void {
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    return;
  }
  vi.stubGlobal('window', new EventTarget());
}

describe('SyncEngine online reconnect', () => {
  beforeEach(() => {
    installWindowStub();
    vi.useFakeTimers();
    processAll.mockClear();
    pullAll.mockClear();
    needsInitialSync.mockClear();
    needsInitialSync.mockResolvedValue(false);
    processAll.mockResolvedValue({
      stats: { total: 0, synced: 0, failed: 0, skipped: 0, pending: 0 },
      errors: [],
    });
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('Offline → Online → tek syncNow(online_reconnect)', async () => {
    const { SyncEngine, ONLINE_RECONNECT_DEBOUNCE_MS } = await import(
      '@/shared/lib/sync/SyncEngine'
    );
    const engine = new SyncEngine();
    const syncSpy = vi.spyOn(engine, 'syncNow');

    engine.start();
    window.dispatchEvent(new Event('online'));
    expect(syncSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(ONLINE_RECONNECT_DEBOUNCE_MS);
    await Promise.resolve();

    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(syncSpy).toHaveBeenCalledWith('online_reconnect');

    engine.stop();
  });

  it('Flapping: çoklu online event → debounce sonrası tek sync', async () => {
    const { SyncEngine, ONLINE_RECONNECT_DEBOUNCE_MS } = await import(
      '@/shared/lib/sync/SyncEngine'
    );
    const engine = new SyncEngine();
    const syncSpy = vi.spyOn(engine, 'syncNow');

    engine.start();
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(ONLINE_RECONNECT_DEBOUNCE_MS / 3);
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(ONLINE_RECONNECT_DEBOUNCE_MS / 3);
    window.dispatchEvent(new Event('online'));
    expect(syncSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(ONLINE_RECONNECT_DEBOUNCE_MS);
    await Promise.resolve();

    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(syncSpy).toHaveBeenCalledWith('online_reconnect');

    engine.stop();
  });

  it('stop() sonrası online event sync tetiklemez', async () => {
    const { SyncEngine, ONLINE_RECONNECT_DEBOUNCE_MS } = await import(
      '@/shared/lib/sync/SyncEngine'
    );
    const engine = new SyncEngine();
    const syncSpy = vi.spyOn(engine, 'syncNow');

    engine.start();
    engine.stop();
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(ONLINE_RECONNECT_DEBOUNCE_MS * 2);
    await Promise.resolve();

    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('stop() bekleyen debounce timerını iptal eder', async () => {
    const { SyncEngine, ONLINE_RECONNECT_DEBOUNCE_MS } = await import(
      '@/shared/lib/sync/SyncEngine'
    );
    const engine = new SyncEngine();
    const syncSpy = vi.spyOn(engine, 'syncNow');

    engine.start();
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(ONLINE_RECONNECT_DEBOUNCE_MS / 2);
    engine.stop();
    await vi.advanceTimersByTimeAsync(ONLINE_RECONNECT_DEBOUNCE_MS);
    await Promise.resolve();

    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('activeSync varken ikinci syncNow aynı promise\'e join eder', async () => {
    const { SyncEngine } = await import('@/shared/lib/sync/SyncEngine');
    const engine = new SyncEngine();

    let releaseProcess!: () => void;
    const deferred = new Promise<{
      stats: {
        total: number;
        synced: number;
        failed: number;
        skipped: number;
        pending: number;
      };
      errors: [];
    }>((resolve) => {
      releaseProcess = () => {
        resolve({
          stats: { total: 0, synced: 0, failed: 0, skipped: 0, pending: 0 },
          errors: [],
        });
      };
    });
    processAll.mockImplementation(async () => deferred);

    const first = engine.syncNow('online_reconnect');
    const second = engine.syncNow('manual');
    expect(second).toBe(first);

    releaseProcess();
    const result = await first;
    await second;
    expect(result.report.trigger).toBe('online_reconnect');
    expect(processAll).toHaveBeenCalledTimes(1);

    engine.stop();
  });
});
