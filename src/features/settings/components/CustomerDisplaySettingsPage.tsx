import { useEffect } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { SettingsBackButton } from './SettingsBackButton';
import { DisplayFieldToggleList } from './DisplayFieldToggleList';
import { useDisplayPreferencesStore } from '@/stores/displayPreferencesStore';
import {
  ALL_CUSTOMER_DISPLAY_FIELDS,
  CUSTOMER_FIELD_LABELS,
} from '@/shared/types/displayPreferences.types';

export function CustomerDisplaySettingsPage() {
  const load = useDisplayPreferencesStore((s) => s.load);
  const customerFields = useDisplayPreferencesStore((s) => s.customerFields);
  const toggleCustomerField = useDisplayPreferencesStore((s) => s.toggleCustomerField);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Müşteri Bilgileri"
        subtitle="Müşteri listesinde gösterilecek alanlar"
        backButton={<SettingsBackButton />}
      />

      <div className="space-y-4 p-4">
        <Card padding="md">
          <p className="text-sm text-brand-gray-600">
            Seçtiğiniz alanlar müşteri listesinde ve yeni sipariş müşteri seçim
            ekranında ve müşteri düzenleme formunda görünür. Seçilmeyen alanlar gizlenir
            (cari kodu ve müşteri adı formda zorunlu olduğu için her zaman görünür).
          </p>
        </Card>

        <DisplayFieldToggleList
          fields={ALL_CUSTOMER_DISPLAY_FIELDS}
          labels={CUSTOMER_FIELD_LABELS}
          selected={customerFields}
          required={['name']}
          onToggle={(field) => { void toggleCustomerField(field); }}
        />
      </div>
    </div>
  );
}
