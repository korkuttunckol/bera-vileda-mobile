import { create } from 'zustand';
import type { SyncReport } from '@/shared/lib/sync/types/sync.types';

interface SyncState {
  isSyncing: boolean;
  lastReport: SyncReport | null;
  lastSyncAt: string | null;
  pendingCount: number;
  dataRevision: number;
  hasRemoteUpdates: boolean;
  setSyncing: (syncing: boolean) => void;
  setLastReport: (report: SyncReport | null) => void;
  setLastSyncAt: (value: string | null) => void;
  setPendingCount: (count: number) => void;
  setHasRemoteUpdates: (value: boolean) => void;
  bumpDataRevision: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastReport: null,
  lastSyncAt: null,
  pendingCount: 0,
  dataRevision: 0,
  hasRemoteUpdates: false,
  setSyncing: (isSyncing) => { set({ isSyncing }); },
  setLastReport: (lastReport) => {
    set((state) => ({
      lastReport,
      dataRevision: state.dataRevision + 1,
    }));
  },
  setLastSyncAt: (lastSyncAt) => { set({ lastSyncAt }); },
  setPendingCount: (pendingCount) => { set({ pendingCount }); },
  setHasRemoteUpdates: (hasRemoteUpdates) => { set({ hasRemoteUpdates }); },
  bumpDataRevision: () => {
    set((state) => ({ dataRevision: state.dataRevision + 1 }));
  },
}));
