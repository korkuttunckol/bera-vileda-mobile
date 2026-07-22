import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { APP_NAME, APP_VERSION } from '@/shared/constants/app';
import { APP_CONFIG, DB_CONFIG } from '@/config/app.config';
import { SettingsBackButton } from './SettingsBackButton';

export function AppInfoPage() {
  return (
    <div>
      <PageHeader title="Uygulama Bilgileri" backButton={<SettingsBackButton />} />
      <div className="space-y-4 p-4">
        <Card padding="md">
          <dl className="space-y-3 text-sm">
            <InfoRow label="Uygulama" value={APP_NAME} />
            <InfoRow label="Sürüm" value={APP_VERSION} />
            <InfoRow label="Açıklama" value={APP_CONFIG.description} />
            <InfoRow
              label="Yerel Veritabanı"
              value={`${DB_CONFIG.name} v${String(DB_CONFIG.version)}`}
            />
            <InfoRow label="Dil / Para Birimi" value={`${APP_CONFIG.locale} / ${APP_CONFIG.currency}`} />
          </dl>
        </Card>

        <Card padding="md">
          <p className="text-xs text-brand-gray-500">
            BERA VİLEDA saha satış sipariş yönetim sistemi. Offline-first
            mimari ile internet bağlantısı olmadan sipariş alınabilir.
          </p>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-brand-gray-500">{label}</dt>
      <dd className="text-right font-medium text-brand-navy">{value}</dd>
    </div>
  );
}
