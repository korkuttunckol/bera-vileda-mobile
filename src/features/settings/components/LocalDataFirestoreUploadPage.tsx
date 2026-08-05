import { useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { useOfflineStore } from '@/stores/offlineStore';
import { toast } from '@/stores/toastStore';
import { SettingsBackButton } from './SettingsBackButton';
import {
  localDataFirestoreUploadService,
  type LocalDataFirestoreUploadResult,
} from '../services/localDataFirestoreUploadService';
import { cn } from '@/shared/utils/cn';

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: 'green' | 'red';
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-gray-100 py-2 last:border-0">
      <span className="text-brand-gray-600">{label}</span>
      <span
        className={cn(
          'font-semibold tabular-nums text-brand-navy',
          highlight === 'green' && 'text-emerald-600',
          highlight === 'red' && 'text-red-600',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function EntityUploadSummary({
  title,
  result,
}: {
  title: string;
  result: LocalDataFirestoreUploadResult['customers'];
}) {
  return (
    <Card padding="md" className="space-y-3">
      <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
      <div className="text-sm">
        <SummaryRow label="Toplam" value={result.total} />
        <SummaryRow label="Yazılan" value={result.written} highlight="green" />
        <SummaryRow
          label="Hatalı"
          value={result.failed}
          highlight={result.failed > 0 ? 'red' : undefined}
        />
      </div>
      {result.failures.length > 0 ? (
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-red-200 bg-red-50/80 p-3">
          {result.failures.map((failure) => (
            <div key={failure.id} className="text-xs text-red-800">
              <p className="font-semibold">
                {failure.label} ({failure.id})
              </p>
              <p className="mt-0.5">{failure.message}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function LocalDataFirestoreUploadPage() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<LocalDataFirestoreUploadResult | null>(
    null,
  );

  const handleUpload = async (): Promise<void> => {
    if (!isOnline) {
      toast('Bu işlem için internet bağlantısı gerekir.', 'warning');
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const uploadResult =
        await localDataFirestoreUploadService.uploadAllFromIndexedDb();
      setResult(uploadResult);

      const totalFailed =
        uploadResult.customers.failed + uploadResult.products.failed;

      if (totalFailed === 0) {
        toast('Yerel veriler Firestore\'a aktarıldı.', 'success');
      } else {
        toast(
          `Aktarım tamamlandı — ${String(totalFailed)} kayıt yazılamadı`,
          'warning',
        );
      }
    } catch (error) {
      console.error('[Upload] Yerel veri aktarım hatası:', error);
      toast(
        error instanceof Error ? error.message : 'Aktarım başarısız',
        'error',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Yerel Verileri Firestore'a Aktar"
        subtitle="IndexedDB'deki cari ve stok kartlarını buluta yükler"
        backButton={<SettingsBackButton />}
      />
      <div className="page-content space-y-4">
        <Card padding="md" className="space-y-4">
          <p className="text-sm text-brand-gray-600">
            Bu araç IndexedDB&apos;deki cari/stok kartlarını Firestore&apos;a
            yazar. Excel import outbox kullanmaz; master data yalnızca bu araçla
            buluta çıkar. Başarılı yazılan kayıtlar yerel olarak &quot;synced&quot;
            işaretlenir.
          </p>
          <p className="text-xs text-brand-gray-500">
            Kayıtlar 500&apos;lük batch grupları halinde gönderilir. Çevrimdışı
            modda çalışmaz; yerel verileriniz cihazda kalır.
          </p>
          <p className="text-sm font-medium text-brand-navy">
            {isOnline ? '🟢 İnternet bağlantısı var' : '🔴 Çevrimdışı'}
          </p>
          <Button
            fullWidth
            size="lg"
            isLoading={isUploading}
            disabled={!isOnline || isUploading}
            onClick={() => void handleUpload()}
          >
            Yerel Verileri Firestore&apos;a Aktar
          </Button>
        </Card>

        {result ? (
          <div className="space-y-4">
            <EntityUploadSummary title="Cari Kartları" result={result.customers} />
            <EntityUploadSummary title="Stok Kartları" result={result.products} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
