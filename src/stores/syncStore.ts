import { create } from 'zustand';
import type { SyncReport } from '@/shared/lib/sync/types/sync.types';
import type { DataSourceSnapshot, DataStatsSnapshot } from '@/shared/lib/sync/dataSource.types';

interface SyncState {
  isSyncing: boolean;
  isInitialSyncing: boolean;
  lastReport: SyncReport | null;
  lastSyncAt: string | null;
  pendingCount: number;
  dataRevision: number;
  hasRemoteUpdates: boolean;
  dataStats: DataStatsSnapshot | null;
  dataSources: DataSourceSnapshot | null;
  setSyncing: (syncing: boolean) => void;
  setInitialSyncing: (syncing: boolean) => void;
  setLastReport: (report: SyncReport | null) => void;
  setLastSyncAt: (value: string | null) => void;
  setPendingCount: (count: number) => void;
  setHasRemoteUpdates: (value: boolean) => void;
  setDataStats: (stats: DataStatsSnapshot | null) => void;
  setDataSources: (sources: DataSourceSnapshot | null) => void;
  bumpDataRevision: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  isInitialSyncing: false,
  lastReport: null,
  lastSyncAt: null,
  pendingCount: 0,
  dataRevision: 0,
  hasRemoteUpdates: false,
  dataStats: null,
  dataSources: null,
  setSyncing: (isSyncing) => { set({ isSyncing }); },
  setInitialSyncing: (isInitialSyncing) => { set({ isInitialSyncing }); },
  setLastReport: (lastReport) => {
    set((state) => ({
      lastReport,
      dataRevision: state.dataRevision + 1,
    }));
  },
  setLastSyncAt: (lastSyncAt) => { set({ lastSyncAt }); },
  setPendingCount: (pendingCount) => { set({ pendingCount }); },
  setHasRemoteUpdates: (hasRemoteUpdates) => { set({ hasRemoteUpdates }); },
  setDataStats: (dataStats) => {
    set({
      dataStats,
      dataSources: dataStats?.sources ?? null,
    });
  },
  setDataSources: (dataSources) => { set({ dataSources }); },
  bumpDataRevision: () => {
    set((state) => ({ dataRevision: state.dataRevision + 1 }));
  },
}));
