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
    async (
      trigger: SyncTrigger = 'manual',
      options: { pullOnly?: boolean } = {},
    ) => {
      if (!isOnline) {
        toast('Çevrimdışı — senkronizasyon internet geldiğinde yapılacak', 'warning');
        return null;
      }

      try {
        const result = await syncService.syncNow(trigger, {
          showDownloadMessage: trigger === 'manual',
          pullOnly: options.pullOnly,
          forceFull: options.pullOnly === true ? true : undefined,
        });
        const { pull } = result.report;

        if (result.success) {
          toast(
            options.pullOnly
              ? `Veriler güncellendi · ${String(pull.customers)} cari, ${String(pull.products)} stok, ${String(pull.users)} kullanıcı`
              : `Senkronizasyon tamamlandı · ${String(pull.customers)} cari, ${String(pull.products)} stok, ${String(pull.users)} kullanıcı`,
            'success',
          );
        } else {
          const errorMessage =
            result.report.errors[0]?.message ?? 'Senkronizasyon hatalarla tamamlandı';
          toast(errorMessage, 'error');
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

  const clearAndResync = useCallback(async () => {
    if (!isOnline) {
      toast('Bu işlem için internet bağlantısı gerekir.', 'warning');
      return null;
    }

    try {
      const result = await syncService.clearLocalMasterDataAndResync();
      if (result.success) {
        toast('Yerel veriler temizlendi ve Firestore\'dan yeniden indirildi.', 'success');
      } else {
        const errorMessage =
          result.report.errors[0]?.message ?? 'Yeniden senkronizasyon başarısız';
        toast(errorMessage, 'error');
      }
      return result;
    } catch (error) {
      console.error('[Sync] Temizle ve yeniden senkronize hatası:', error);
      toast(error instanceof Error ? error.message : 'Yeniden senkronizasyon başarısız', 'error');
      return null;
    }
  }, [isOnline]);

  return {
    isSyncing,
    isInitialSyncing,
    lastReport,
    pendingCount,
    syncNow,
    clearAndResync,
  };
}
