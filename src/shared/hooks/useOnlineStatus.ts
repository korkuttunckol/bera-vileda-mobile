import { useEffect } from 'react';
import { useOfflineStore } from '@/stores/offlineStore';

export function useOnlineStatus(): boolean {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const setOnline = useOfflineStore((s) => s.setOnline);

  useEffect(() => {
    const handleOnline = (): void => { setOnline(true); };
    const handleOffline = (): void => { setOnline(false); };

    setOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return isOnline;
}
