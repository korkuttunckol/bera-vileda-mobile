import { describe, expect, it } from 'vitest';
import { resolveSyncStatus } from '@/features/sync/utils/resolveSyncStatus';

describe('resolveSyncStatus', () => {
  const base = {
    isOnline: true,
    isSyncing: false,
    isInitialSyncing: false,
    lastSyncAt: '2026-08-05T12:00:00.000Z',
    lastReportSuccess: true as boolean | null,
    count: 10,
    warnWhenEmpty: true,
  };

  it('returns success when lastSyncAt is set and count > 0', () => {
    expect(resolveSyncStatus(base)).toBe('success');
  });

  it('returns empty when lastSyncAt is set but customer/product count is 0', () => {
    expect(resolveSyncStatus({ ...base, count: 0 })).toBe('empty');
  });

  it('does not warn empty for users row even when count is 0', () => {
    expect(
      resolveSyncStatus({ ...base, count: 0, warnWhenEmpty: false }),
    ).toBe('success');
  });

  it('keeps failed / offline / syncing precedence over empty', () => {
    expect(
      resolveSyncStatus({ ...base, count: 0, lastReportSuccess: false }),
    ).toBe('failed');
    expect(resolveSyncStatus({ ...base, count: 0, isOnline: false })).toBe(
      'offline',
    );
    expect(resolveSyncStatus({ ...base, count: 0, isSyncing: true })).toBe(
      'syncing',
    );
  });

  it('returns pending when never synced', () => {
    expect(
      resolveSyncStatus({
        ...base,
        lastSyncAt: null,
        lastReportSuccess: null,
        count: 0,
      }),
    ).toBe('pending');
  });
});
