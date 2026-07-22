import { useOfflineStore } from '@/stores/offlineStore';
import { useSyncStore } from '@/stores/syncStore';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const pendingSyncCount = useOfflineStore((s) => s.pendingSyncCount);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  if (isOnline && pendingSyncCount === 0 && !isSyncing) return null;

  return (
    <div
      className={
        !isOnline
          ? 'bg-brand-navy px-4 py-2 text-center text-sm text-white'
          : isSyncing
            ? 'bg-brand-navy-light px-4 py-2 text-center text-sm text-white'
            : 'bg-yellow-50 px-4 py-2 text-center text-sm text-yellow-800'
      }
      role="status"
    >
      {!isOnline ? (
        <span>Çevrimdışı mod — Siparişler cihazınıza kaydedilecek</span>
      ) : isSyncing ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Senkronizasyon devam ediyor...
        </span>
      ) : pendingSyncCount > 0 ? (
        <span>{pendingSyncCount} kayıt senkronizasyon bekliyor</span>
      ) : null}
    </div>
  );
}
