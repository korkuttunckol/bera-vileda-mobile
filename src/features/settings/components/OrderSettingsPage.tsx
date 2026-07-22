import { useEffect } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { SettingsBackButton } from './SettingsBackButton';
import { useOrderSettingsStore } from '@/stores/orderSettingsStore';

export function OrderSettingsPage() {
  const load = useOrderSettingsStore((s) => s.load);
  const allowOutOfStockOrders = useOrderSettingsStore((s) => s.allowOutOfStockOrders);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Sipariş Ayarları"
        subtitle="Stok kontrolü ve sipariş kuralları"
        backButton={<SettingsBackButton />}
      />

      <div className="space-y-4 p-4">
        <Card padding="md">
          <p className="text-sm text-brand-gray-600">
            Stok bilgisi şu an yalnızca bilgilendirme amaçlıdır; stokta olmayan
            ürünler de siparişe eklenebilir. Aşağıdaki seçenek ileride
            etkinleştirilecektir.
          </p>
        </Card>

        <Card padding="md">
          <label className="flex cursor-not-allowed items-start gap-3 opacity-60">
            <input
              type="checkbox"
              checked={allowOutOfStockOrders}
              disabled
              readOnly
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-brand-gray-300 text-brand-navy"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-brand-navy">
                Stokta olmayan ürünlerin sipariş edilmesine izin ver
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-brand-gray-500">
                Yakında etkinleştirilecek. Şu an tüm ürünler stok durumundan
                bağımsız sipariş edilebilir; stok 0 olan ürünlerde kırmızı
                &quot;Stok Yok&quot; etiketi gösterilir.
              </span>
            </span>
          </label>
        </Card>
      </div>
    </div>
  );
}
