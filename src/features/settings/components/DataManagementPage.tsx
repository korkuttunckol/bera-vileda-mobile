import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Icon } from '@/shared/components/ui/Icon';
import { ROUTES } from '@/shared/constants/routes';
import { SettingsBackButton } from './SettingsBackButton';

const DATA_MANAGEMENT_ITEMS = [
  { label: 'Ürün Kartlarını İçe Aktar', path: ROUTES.SETTINGS_IMPORT_PRODUCTS },
  { label: 'Cari Kartlarını İçe Aktar', path: ROUTES.SETTINGS_IMPORT_CUSTOMERS },
  { label: 'Depo Stoklarını Güncelle', path: ROUTES.SETTINGS_STOCK_UPDATE },
  { label: 'Demo Verileri Yükle', path: ROUTES.SETTINGS_DEMO_DATA },
  { label: 'İçe Aktarma Raporları', path: ROUTES.SETTINGS_IMPORT_REPORTS },
  { label: 'Sipariş Verilerini Temizle', path: ROUTES.SETTINGS_CLEAR_ORDERS },
] as const;

export function DataManagementPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Veri Yönetimi"
        subtitle="İçe aktarma, stok ve veri temizleme işlemleri"
        backButton={<SettingsBackButton />}
      />
      <div className="page-content space-y-8">
        <div className="list-stack">
          {DATA_MANAGEMENT_ITEMS.map((item) => (
            <Card
              key={item.path}
              padding="none"
              interactive
              onClick={() => void navigate(item.path)}
            >
              <div className="settings-row">
                <span className="text-base font-medium text-brand-navy">{item.label}</span>
                <Icon name="chevron-right" size="md" className="text-brand-gray-400" />
              </div>
            </Card>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-red-500">
            Tehlikeli İşlemler
          </h2>
          <Card
            padding="none"
            interactive
            className="border-red-200 bg-red-50/50"
            onClick={() => void navigate(ROUTES.SETTINGS_RESET_ALL_DATA)}
          >
            <div className="settings-row">
              <span className="text-base font-semibold text-red-600">Tüm Verileri Sıfırla</span>
              <Icon name="chevron-right" size="md" className="text-red-400" />
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
