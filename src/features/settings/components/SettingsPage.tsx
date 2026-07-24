import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Icon } from '@/shared/components/ui/Icon';
import { APP_NAME, APP_VERSION } from '@/shared/constants/app';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/utils/cn';

interface SettingsItem {
  label: string;
  path: string;
  danger?: boolean;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const ADMIN_SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: 'Kullanıcılar',
    items: [{ label: 'Kullanıcı Yönetimi', path: ROUTES.SETTINGS_USERS }],
  },
  {
    title: 'Senkronizasyon',
    items: [
      { label: 'Senkronizasyon', path: ROUTES.SETTINGS_SYNC },
      {
        label: "Yerel Verileri Firestore'a Aktar",
        path: ROUTES.SETTINGS_UPLOAD_LOCAL_FIRESTORE,
      },
    ],
  },
  {
    title: 'Görünüm & Tercihler',
    items: [
      { label: 'Müşteri Bilgileri', path: ROUTES.SETTINGS_CUSTOMER_DISPLAY },
      { label: 'Ürün Bilgileri', path: ROUTES.SETTINGS_PRODUCT_DISPLAY },
      { label: 'Sipariş Ayarları', path: ROUTES.SETTINGS_ORDER },
    ],
  },
  {
    title: 'Veri Yönetimi',
    items: [{ label: 'Veri Yönetimi', path: ROUTES.SETTINGS_DATA_MANAGEMENT }],
  },
  {
    title: 'Hakkında',
    items: [{ label: 'Uygulama Bilgileri', path: ROUTES.SETTINGS_APP_INFO }],
  },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();

  if (!can('systemSettings')) {
    return null;
  }

  return (
    <div>
      <PageHeader title="Ayarlar" subtitle="Uygulama tercihleri ve veri yönetimi" />
      <div className="page-content">
        <div className="space-y-6">
          {ADMIN_SETTINGS_SECTIONS.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-brand-gray-400">
                {section.title}
              </h2>
              <div className="list-stack">
                {section.items.map((item) => (
                  <Card
                    key={item.path}
                    padding="none"
                    interactive
                    onClick={() => void navigate(item.path)}
                  >
                    <div className="settings-row">
                      <span
                        className={cn(
                          'text-base font-medium',
                          item.danger ? 'text-red-600' : 'text-brand-navy',
                        )}
                      >
                        {item.label}
                      </span>
                      <Icon
                        name="chevron-right"
                        size="md"
                        className={item.danger ? 'text-red-400' : 'text-brand-gray-400'}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        <Card padding="md" className="shadow-card">
          <p className="text-base font-semibold text-brand-navy">{APP_NAME}</p>
          <p className="mt-1 text-sm text-brand-gray-500">Sürüm {APP_VERSION}</p>
        </Card>
      </div>
    </div>
  );
}
