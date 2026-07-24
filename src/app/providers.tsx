import { type ReactNode, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { initDatabase } from '@/shared/lib/indexeddb/db';
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
    });

    syncEngine.start();

    const unsubscribe = syncEngine.onReport((report) => {
      useSyncStore.getState().setLastReport(report);
      void syncService.refreshPendingCount();
      syncService.notifyDataChanged();
    });

    return () => {
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
