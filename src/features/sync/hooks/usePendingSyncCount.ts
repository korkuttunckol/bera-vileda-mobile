import { useOfflineStore } from '@/stores/offlineStore';

/** Tek kaynak: bekleyen sipariş senkronizasyon sayısı */
export function usePendingSyncCount(): number {
  return useOfflineStore((s) => s.pendingSyncCount);
}
