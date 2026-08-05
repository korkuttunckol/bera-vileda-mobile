export type SyncRowStatus =
  | 'syncing'
  | 'success'
  | 'failed'
  | 'offline'
  | 'pending'
  | 'empty';

export function resolveSyncStatus(input: {
  isOnline: boolean;
  isSyncing: boolean;
  isInitialSyncing: boolean;
  lastSyncAt: string | null;
  lastReportSuccess: boolean | null;
  count: number;
  /** When true, lastSyncAt + count===0 yields empty warning instead of success. */
  warnWhenEmpty: boolean;
}): SyncRowStatus {
  if (input.isSyncing || input.isInitialSyncing) {
    return 'syncing';
  }
  if (!input.isOnline) {
    return 'offline';
  }
  if (input.lastReportSuccess === false) {
    return 'failed';
  }
  if (input.lastSyncAt) {
    if (input.warnWhenEmpty && input.count === 0) {
      return 'empty';
    }
    return 'success';
  }
  return 'pending';
}
