import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { SyncReportCard } from '@/features/sync/components/SyncReportCard';
import { useSync } from '@/features/sync/hooks/useSync';
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
  const { isSyncing, lastReport, syncNow } = useSync();

  return (
    <div>
      <PageHeader
        title="Senkronizasyon"
        subtitle="Offline sipariş yönetimi"
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
          </div>
        </Card>

        {hasRemoteUpdates ? (
          <Card padding="md" className="border-emerald-200 bg-emerald-50">
            <p className="text-sm font-medium text-emerald-800">
              Yeni veri indirildi. Cari ve stok kartları güncellendi.
            </p>
          </Card>
        ) : null}

        <Card padding="md">
          <CardHeader title="Manuel Senkronizasyon" />
          <p className="mb-4 text-sm leading-relaxed text-brand-gray-500">
            Offline siparişler internet geldiğinde otomatik gönderilir. İsterseniz
            manuel olarak da senkronize edebilirsiniz.
          </p>
          <Button
            fullWidth
            variant="outline"
            onClick={() => void syncNow('manual')}
            isLoading={isSyncing}
          >
            Şimdi Senkronize Et ({pendingCount})
          </Button>
        </Card>

        {lastReport ? <SyncReportCard report={lastReport} variant="full" /> : null}
      </div>
    </div>
  );
}
