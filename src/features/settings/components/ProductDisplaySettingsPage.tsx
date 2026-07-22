import { useEffect } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { SettingsBackButton } from './SettingsBackButton';
import { DisplayFieldToggleList } from './DisplayFieldToggleList';
import { useDisplayPreferencesStore } from '@/stores/displayPreferencesStore';
import {
  ALL_PRODUCT_DISPLAY_FIELDS,
  PRODUCT_FIELD_LABELS,
} from '@/shared/types/displayPreferences.types';

export function ProductDisplaySettingsPage() {
  const load = useDisplayPreferencesStore((s) => s.load);
  const productFields = useDisplayPreferencesStore((s) => s.productFields);
  const toggleProductField = useDisplayPreferencesStore((s) => s.toggleProductField);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Ürün Bilgileri"
        subtitle="Ürün listesinde gösterilecek kolonlar"
        backButton={<SettingsBackButton />}
      />

      <div className="space-y-4 p-4">
        <Card padding="md">
          <p className="text-sm text-brand-gray-600">
            Seçtiğiniz kolonlar ürün kataloğunda, yeni sipariş ürün listesinde ve
            stok kartı ekranında görünür. Seçilmeyen kolonlar gizlenir (ürün adı
            ve SKU formda zorunlu olduğu için stok kartında her zaman görünür).
          </p>
        </Card>

        <DisplayFieldToggleList
          fields={ALL_PRODUCT_DISPLAY_FIELDS}
          labels={PRODUCT_FIELD_LABELS}
          selected={productFields}
          required={['name']}
          onToggle={(field) => { void toggleProductField(field); }}
        />
      </div>
    </div>
  );
}
