import { useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { ExcelFilePicker } from '@/shared/components/form/ExcelFilePicker';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { stockUpdateService } from '../services/stockUpdateService';
import { SettingsBackButton } from './SettingsBackButton';
import { ImportResultSummary } from './ImportResultSummary';
import type { ImportReport } from '@/shared/types/import.types';

export function StockUpdatePage() {
  const user = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const handleUpdate = async (file: File): Promise<void> => {
    if (!user) {
      toast('Oturum açmanız gerekiyor', 'error');
      return;
    }

    setIsLoading(true);
    setReport(null);

    try {
      const result = await stockUpdateService.updateFromFile(file, user.uid);
      setReport(result);
      toast(
        result.failed > 0 || result.notFound > 0
          ? `Stok güncelleme tamamlandı — ${String(result.failed)} hatalı, ${String(result.notFound)} bulunamayan satır`
          : 'Stok güncelleme başarıyla tamamlandı.',
        result.failed > 0 || result.notFound > 0 ? 'warning' : 'success',
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Stok güncelleme başarısız', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Depo Stoklarını Güncelle"
        backButton={<SettingsBackButton />}
      />
      <div className="space-y-4 p-4">
        <Card padding="md">
          <p className="mb-3 text-sm text-brand-gray-600">
            Yalnızca Excel dosyasında bulunan ürünlerin depo stok miktarları
            güncellenir. Dosyada olmayan ürünlerin stokları değişmez.
          </p>
          <p className="mb-4 text-xs text-brand-gray-400">
            Zorunlu sütunlar: PRODUCERCODE (Ürün Kodu), MERKEZ (Depo Stok). CODE
            (Barkod) ve NAME (Ürün Adı) isteğe bağlıdır. Eşleştirme önce
            PRODUCERCODE, bulunamazsa CODE (Barkod) ile yapılır. Sütun sırası
            önemli değildir.
          </p>
          <ExcelFilePicker
            onFileSelect={(f) => void handleUpdate(f)}
            isLoading={isLoading}
            selectLabel="Stok Excel Dosyası Seç"
          />
        </Card>

        {report ? <ImportResultSummary report={report} /> : null}
      </div>
    </div>
  );
}
