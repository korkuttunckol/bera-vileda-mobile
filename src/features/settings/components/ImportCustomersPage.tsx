import { useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { ExcelFilePicker } from '@/shared/components/form/ExcelFilePicker';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { customerImportService } from '../services/customerImportService';
import { SettingsBackButton } from './SettingsBackButton';
import { ImportResultSummary } from './ImportResultSummary';
import type { ImportReport } from '@/shared/types/import.types';

export function ImportCustomersPage() {
  const user = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const handleImport = async (file: File): Promise<void> => {
    if (!user) {
      toast('Oturum açmanız gerekiyor', 'error');
      return;
    }

    setIsLoading(true);
    setReport(null);

    try {
      const result = await customerImportService.importFromFile(file, user.uid);
      setReport(result);

      if (result.failed === 0) {
        toast('Müşteri aktarımı başarıyla tamamlandı.', 'success');
      } else {
        toast(
          `İçe aktarma tamamlandı — ${String(result.failed)} hatalı kayıt`,
          'warning',
        );
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'İçe aktarma başarısız', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Cari Kartlarını İçe Aktar"
        backButton={<SettingsBackButton />}
      />
      <div className="space-y-4 p-4">
        <Card padding="md">
          <p className="mb-3 text-sm text-brand-gray-600">
            Excel dosyasındaki cari kartlar yerel veritabanına aktarılır. Mevcut
            kayıtlar güncellenir, yeni kayıtlar oluşturulur. Silme işlemi
            yapılmaz.
          </p>
          <p className="mb-4 text-xs text-brand-gray-400">
            Zorunlu sütunlar: Cari Kodu, Cari Adı, Şehir (Logo Wings Excel formatı).
            Diğer sütunlar bu sürümde dikkate alınmaz.
          </p>
          <ExcelFilePicker
            mode="confirm"
            selectLabel="Müşteri Yükle"
            importLabel="İçe Aktar"
            isLoading={isLoading}
            onImport={(f) => void handleImport(f)}
            onFileChange={() => { setReport(null); }}
          />
        </Card>

        {report ? <ImportResultSummary report={report} /> : null}
      </div>
    </div>
  );
}
