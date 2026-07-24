import { useState } from 'react';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/Modal';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { SyncReportCard } from '@/features/sync/components/SyncReportCard';
import { SyncStatusPanel } from '@/features/sync/components/SyncStatusPanel';
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
  const { isSyncing, isInitialSyncing, lastReport, syncNow, clearAndResync } = useSync();
  const [showResyncConfirm, setShowResyncConfirm] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  const handleClearAndResync = async (): Promise<void> => {
    setIsResyncing(true);
    try {
      await clearAndResync();
      setShowResyncConfirm(false);
    } finally {
      setIsResyncing(false);
    }
  };

  const isBusy = isSyncing || isInitialSyncing || isResyncing;

  return (
    <div>
      <PageHeader
        title="Senkronizasyon"
        subtitle="Cari, stok ve kullanıcı verilerini güncel tutun"
        backButton={<SettingsBackButton />}
      />
      <div className="page-content space-y-4">
        <Card padding="md">
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-brand-navy">
              {isOnline ? '🟢 İnternet bağlantısı var' : '🔴 Çevrimdışı'}
            </p>
            {isBusy ? (
              <p className="font-medium text-brand-navy">Senkronize ediliyor...</p>
            ) : null}
            <p className="text-brand-gray-600">
              Bekleyen gönderim : {pendingCount}
            </p>
            <p className="text-brand-gray-600">
              Son senkronizasyon : {formatLastSyncLabel(lastSyncAt)}
            </p>
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Veri Durumu" />
          <SyncStatusPanel
            isSyncing={isSyncing || isResyncing}
            isInitialSyncing={isInitialSyncing}
          />
        </Card>

        {hasRemoteUpdates ? (
          <Card padding="md" className="border-emerald-200 bg-emerald-50">
            <p className="text-sm font-medium text-emerald-800">
              Veriler güncellendi. Cari, stok ve kullanıcı kayıtları yenilendi.
            </p>
          </Card>
        ) : null}

        <Card padding="md">
          <CardHeader title="Manuel Senkronizasyon" />
          <p className="mb-4 text-sm leading-relaxed text-brand-gray-500">
            Tüm cari, stok ve kullanıcı verilerini sunucudan indirir. Mac ve iPhone&apos;da
            aynı sayıları görmek için her iki cihazda da bu işlemi çalıştırın.
          </p>
          <Button
            fullWidth
            variant="outline"
            onClick={() => void syncNow('manual')}
            isLoading={isBusy}
            disabled={!isOnline}
          >
            Şimdi Senkronize Et ({pendingCount})
          </Button>
        </Card>

        <Card padding="md" className="border-amber-200 bg-amber-50/60">
          <CardHeader title="Temizle ve Yeniden Senkronize Et" />
          <p className="mb-4 text-sm leading-relaxed text-brand-gray-600">
            Bu cihazdaki cari, stok ve kullanıcı kayıtlarını sıfırlar; ardından sunucudan
            tüm verileri baştan indirir. Sipariş kayıtları etkilenmez. Sayılar hâlâ
            farklıysa her iki cihazda bu işlemi deneyin.
          </p>
          <Button
            fullWidth
            variant="danger"
            disabled={!isOnline || isBusy}
            onClick={() => { setShowResyncConfirm(true); }}
          >
            Tüm Yerel Verileri Temizle ve Yeniden Senkronize Et
          </Button>
        </Card>

        {lastReport ? <SyncReportCard report={lastReport} variant="full" /> : null}
      </div>

      <ConfirmDialog
        isOpen={showResyncConfirm}
        onClose={() => {
          if (!isResyncing) setShowResyncConfirm(false);
        }}
        onConfirm={() => void handleClearAndResync()}
        title="Yerel Verileri Temizle"
        message="Bu cihazdaki cari, stok, şube ve kullanıcı kayıtları silinecek; ardından sunucudan tüm veriler yeniden indirilecek. Devam etmek istiyor musunuz?"
        confirmLabel="Evet, Temizle ve İndir"
        cancelLabel="İptal"
        variant="danger"
        isLoading={isResyncing}
      />
    </div>
  );
}
