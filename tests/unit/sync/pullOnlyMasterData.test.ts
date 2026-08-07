import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushPendingUsers = vi.fn(async () => ({
  total: 0,
  synced: 0,
  failed: 0,
  errors: [],
}));

const processAll = vi.fn(async () => ({
  stats: { total: 0, synced: 0, failed: 0, skipped: 0, pending: 0 },
  errors: [],
}));

const pullAll = vi.fn(async () => ({
  customers: 3,
  products: 2,
  users: 1,
  full: true,
}));

vi.mock('@/config/env', () => ({
  isFirebaseConfigured: () => true,
  env: {
    VITE_FIREBASE_API_KEY: 'test',
    VITE_FIREBASE_AUTH_DOMAIN: 'test',
    VITE_FIREBASE_PROJECT_ID: 'test',
    VITE_FIREBASE_STORAGE_BUCKET: 'test',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'test',
    VITE_FIREBASE_APP_ID: 'test',
    VITE_APP_ENV: 'development',
  },
}));

vi.mock('@/features/users/services/userPushService', () => ({
  pushPendingUsers: () => pushPendingUsers(),
}));

vi.mock('@/shared/lib/sync/OutboxProcessor', () => ({
  outboxProcessor: {
    processAll: () => processAll(),
  },
}));

vi.mock('@/shared/lib/sync/PullSync', () => ({
  pullSync: {
    needsInitialSync: async () => false,
    pullAll: (options: { full?: boolean }) => pullAll(options),
  },
}));

vi.mock('@/shared/lib/sync/syncReportBuilder', () => ({
  buildSyncReport: async (input: {
    trigger: string;
    pull: { customers: number; products: number; users: number; full: boolean };
    errors: unknown[];
    startedAt: string;
  }) => ({
    id: 'report-1',
    startedAt: input.startedAt,
    completedAt: new Date().toISOString(),
    durationMs: 1,
    trigger: input.trigger,
    push: { total: 0, synced: 0, failed: 0, skipped: 0, pending: 0 },
    pull: input.pull,
    errors: input.errors,
    success: true,
    orders: { sent: 0, pending: 0, failed: 0, sending: 0 },
  }),
  saveAndNotifySyncReport: async () => undefined,
}));

vi.mock('@/shared/lib/firebase/firestoreService', () => ({
  saveSyncLog: vi.fn(async () => undefined),
}));

vi.mock('@/shared/lib/indexeddb/db', () => ({
  META_KEYS: { LAST_SYNC_AT: 'lastSyncAt' },
  setMetaValue: vi.fn(async () => undefined),
}));

vi.mock('@/shared/lib/sync/syncPullLogger', () => ({
  logSyncFailed: vi.fn(),
}));

describe('SyncEngine pullOnly master data', () => {
  beforeEach(() => {
    pushPendingUsers.mockClear();
    processAll.mockClear();
    pullAll.mockClear();
    vi.stubGlobal('navigator', { onLine: true });
    vi.resetModules();
  });

  it('pullOnly runs full pull and skips user push + outbox', async () => {
    const { SyncEngine } = await import('@/shared/lib/sync/SyncEngine');
    const engine = new SyncEngine();

    const result = await engine.syncNow('manual', { pullOnly: true });

    expect(result.success).toBe(true);
    expect(pullAll).toHaveBeenCalledWith({ full: true });
    expect(pushPendingUsers).not.toHaveBeenCalled();
    expect(processAll).not.toHaveBeenCalled();
  });

  it('normal manual sync still pushes users and outbox', async () => {
    const { SyncEngine } = await import('@/shared/lib/sync/SyncEngine');
    const engine = new SyncEngine();

    await engine.syncNow('manual', { full: true });

    expect(pushPendingUsers).toHaveBeenCalledTimes(1);
    expect(processAll).toHaveBeenCalledTimes(1);
    expect(pullAll).toHaveBeenCalledWith({ full: true });
  });
});

describe('Merch pullMasterData permission', () => {
  it('grants Merch pullMasterData but not syncManagement/upload paths', async () => {
    const { hasPermission, PERMISSIONS } = await import(
      '@/features/auth/permissions'
    );
    const { UserRole } = await import('@/shared/types/role.types');

    const merch = {
      uid: 'm1',
      userCode: 'MERCH01',
      displayName: 'Merch',
      role: UserRole.MERCH,
    };

    expect(hasPermission(merch, PERMISSIONS.pullMasterData)).toBe(true);
    expect(hasPermission(merch, PERMISSIONS.syncManagement)).toBe(false);
    expect(hasPermission(merch, PERMISSIONS.manageUsers)).toBe(false);
    expect(hasPermission(merch, PERMISSIONS.importExcel)).toBe(false);
    expect(hasPermission(merch, PERMISSIONS.systemSettings)).toBe(false);
  });
});
