import { create } from 'zustand';
import type { SyncReport } from '@/shared/lib/sync/types/sync.types';

interface SyncState {
  isSyncing: boolean;
  lastReport: SyncReport | null;
  pendingCount: number;
  dataRevision: number;
  setSyncing: (syncing: boolean) => void;
  setLastReport: (report: SyncReport | null) => void;
  setPendingCount: (count: number) => void;
  bumpDataRevision: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastReport: null,
  pendingCount: 0,
  dataRevision: 0,
  setSyncing: (isSyncing) => { set({ isSyncing }); },
  setLastReport: (lastReport) => {
    set((state) => ({
      lastReport,
      dataRevision: state.dataRevision + 1,
    }));
  },
  setPendingCount: (pendingCount) => { set({ pendingCount }); },
  bumpDataRevision: () => {
    set((state) => ({ dataRevision: state.dataRevision + 1 }));
  },
}));
