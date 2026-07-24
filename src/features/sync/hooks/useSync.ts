import { useCallback, useEffect } from 'react';
import { syncService } from '../services/syncService';
import { useSyncStore } from '@/stores/syncStore';
import { useOfflineStore } from '@/stores/offlineStore';
import { usePendingSyncCount } from './usePendingSyncCount';
import { toast } from '@/stores/toastStore';
import type { SyncTrigger } from '@/shared/lib/sync/types/sync.types';

export function useSync() {
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const isInitialSyncing = useSyncStore((s) => s.isInitialSyncing);
  const lastReport = useSyncStore((s) => s.lastReport);
  const pendingCount = usePendingSyncCount();
  const isOnline = useOfflineStore((s) => s.isOnline);

  useEffect(() => {
    void syncService.refreshPendingCount();
    void syncService.loadLastReport();
    void syncService.refreshDataStats();
  }, []);

  const syncNow = useCallback(
    async (trigger: SyncTrigger = 'manual') => {
      if (!isOnline) {
        toast('Çevrimdışı — senkronizasyon internet geldiğinde yapılacak', 'warning');
        return null;
      }

      try {
        const result = await syncService.syncNow(trigger);
        const { pull } = result.report;

        if (result.success) {
          toast(
            `Senkronizasyon tamamlandı · ${String(pull.customers)} cari, ${String(pull.products)} stok, ${String(pull.users)} kullanıcı güncellendi`,
            'success',
          );
        } else {
          toast('Senkronizasyon hatalarla tamamlandı', 'error');
        }

        return result;
      } catch (error) {
        console.error('[Sync] Manuel senkronizasyon hatası:', error);
        toast(error instanceof Error ? error.message : 'Senkronizasyon başarısız', 'error');
        return null;
      }
    },
    [isOnline],
  );

  return { isSyncing, isInitialSyncing, lastReport, pendingCount, syncNow };
}
