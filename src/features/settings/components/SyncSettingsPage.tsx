import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { SyncReportCard } from '@/features/sync/components/SyncReportCard';
import { DataSourcePanel } from '@/features/sync/components/DataSourcePanel';
import { useSync } from '@/features/sync/hooks/useSync';
import { useDataStats } from '@/features/sync/hooks/useDataStats';
import { usePendingSyncCount } from '@/features/sync/hooks/usePendingSyncCount';
import { useOfflineStore } from '@/stores/offlineStore';
import { useSyncStore } from '@/stores/syncStore';
import { formatLastSyncLabel } from '@/features/sync/utils/lastSyncFormat';
import { SettingsBackButton } from './SettingsBackButton';

export function SyncSettingsPage() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const pendingCount = usePendingSyncCount();
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const hasRemoteUpdates = useSyncStore((s) => s.hasRemoteUpdates);
  const isInitialSyncing = useSyncStore((s) => s.isInitialSyncing);
  const { stats } = useDataStats();
  const { isSyncing, lastReport, syncNow } = useSync();

  return (
    <div>
      <PageHeader
        title="Senkronizasyon"
        subtitle="Firestore ↔ IndexedDB veri eşitleme"
        backButton={<SettingsBackButton />}
      />
      <div className="page-content space-y-4">
        <Card padding="md">
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-brand-navy">
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </p>
            <p className="text-brand-gray-600">
              Bekleyen Senkronizasyon : {pendingCount}
            </p>
            <p className="text-brand-gray-600">
              Son Senkronizasyon : {formatLastSyncLabel(lastSyncAt)}
            </p>
            {stats ? (
              <>
                <p className="text-brand-gray-600">Cari Sayısı : {stats.customerCount}</p>
                <p className="text-brand-gray-600">Stok Sayısı : {stats.productCount}</p>
                <p className="text-brand-gray-600">Kullanıcı Sayısı : {stats.userCount}</p>
              </>
            ) : null}
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Veri Kaynağı" />
          <DataSourcePanel sources={stats?.sources ?? null} />
        </Card>

        {hasRemoteUpdates ? (
          <Card padding="md" className="border-emerald-200 bg-emerald-50">
            <p className="text-sm font-medium text-emerald-800">
              Yeni veri indirildi. Cari, stok ve kullanıcı kayıtları güncellendi.
            </p>
          </Card>
        ) : null}

        <Card padding="md">
          <CardHeader title="Manuel Senkronizasyon" />
          <p className="mb-4 text-sm leading-relaxed text-brand-gray-500">
            Manuel senkronizasyon Firestore&apos;dan tüm cari, stok ve kullanıcı verilerini
            çeker ve IndexedDB önbelleğini günceller. Mac ve iPhone aynı sayıları göstermek
            için her iki cihazda da bu işlemi çalıştırın.
          </p>
          <Button
            fullWidth
            variant="outline"
            onClick={() => void syncNow('manual')}
            isLoading={isSyncing || isInitialSyncing}
            disabled={!isOnline}
          >
            Şimdi Senkronize Et ({pendingCount})
          </Button>
        </Card>

        {lastReport ? <SyncReportCard report={lastReport} variant="full" /> : null}
      </div>
    </div>
  );
}
