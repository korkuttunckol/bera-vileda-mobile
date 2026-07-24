import { useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { dataStatsService } from '../services/dataStatsService';
import type { DataStatsSnapshot } from '@/shared/lib/sync/dataSource.types';

export function useDataStats() {
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const cachedStats = useSyncStore((s) => s.dataStats);
  const [stats, setStats] = useState<DataStatsSnapshot | null>(cachedStats);
  const [isLoading, setIsLoading] = useState(!cachedStats);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await dataStatsService.getStats();
      setStats(next);
      useSyncStore.getState().setDataStats(next);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  return { stats, isLoading, reload };
}
