import { useCallback, useEffect } from 'react';
import { syncService } from '../services/syncService';
import { useSyncStore } from '@/stores/syncStore';
import { useOfflineStore } from '@/stores/offlineStore';
import { usePendingSyncCount } from './usePendingSyncCount';
import { toast } from '@/stores/toastStore';
import type { SyncTrigger } from '@/shared/lib/sync/types/sync.types';

export function useSync() {
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const lastReport = useSyncStore((s) => s.lastReport);
  const pendingCount = usePendingSyncCount();
  const isOnline = useOfflineStore((s) => s.isOnline);

  useEffect(() => {
    void syncService.refreshPendingCount();
    void syncService.loadLastReport();
  }, []);

  const syncNow = useCallback(
    async (trigger: SyncTrigger = 'manual') => {
      if (!isOnline) {
        toast('Çevrimdışı — senkronizasyon internet geldiğinde yapılacak', 'warning');
        return null;
      }

      const result = await syncService.syncNow(trigger);
      if (result.success) {
        toast(
          `Senkronizasyon tamamlandı (${String(result.report.push.synced)} gönderildi)`,
          'success',
        );
      } else {
        toast('Senkronizasyon hatalarla tamamlandı', 'error');
      }
      return result;
    },
    [isOnline],
  );

  return { isSyncing, lastReport, pendingCount, syncNow };
}
