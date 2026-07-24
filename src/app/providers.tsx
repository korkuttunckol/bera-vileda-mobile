import { type ReactNode, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { initDatabase } from '@/shared/lib/indexeddb/db';
import { SYNC_CONFIG } from '@/config/app.config';
import { syncEngine } from '@/shared/lib/sync/SyncEngine';
import { syncService } from '@/features/sync/services/syncService';
import { useSyncStore } from '@/stores/syncStore';
import { useDisplayPreferencesStore } from '@/stores/displayPreferencesStore';
import { useOrderSettingsStore } from '@/stores/orderSettingsStore';

interface AppProvidersProps {
  children?: ReactNode;
}

function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    void initDatabase().then(async () => {
      void useDisplayPreferencesStore.getState().load();
      void useOrderSettingsStore.getState().load();
      await syncService.refreshPendingCount();
      await syncService.loadLastReport();
      await syncService.loadDataSourcesFromMeta();
      await syncService.refreshDataStats();

      if (navigator.onLine) {
        try {
          await syncService.syncNow('auto', { showDownloadMessage: true });
        } catch (error) {
          console.error('[App] Başlangıç senkronizasyonu başarısız:', error);
        }
      }
    });

    syncEngine.start();

    const runBackgroundSync = (trigger: 'auto' | 'online_reconnect'): void => {
      void syncService.syncNow(trigger);
    };

    const onlineHandler = (): void => {
      if (navigator.onLine) {
        runBackgroundSync('online_reconnect');
      }
    };
    window.addEventListener('online', onlineHandler);

    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        runBackgroundSync('auto');
      }
    }, SYNC_CONFIG.autoSyncIntervalMs);

    const unsubscribe = syncEngine.onReport((report) => {
      useSyncStore.getState().setLastReport(report);
      void syncService.refreshPendingCount();
      syncService.notifyDataChanged();
    });

    return () => {
      window.removeEventListener('online', onlineHandler);
      clearInterval(intervalId);
      unsubscribe();
      syncEngine.stop();
    };
  }, []);

  return <>{children}</>;
}

export function Providers() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
