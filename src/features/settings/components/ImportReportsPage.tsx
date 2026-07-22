import { useEffect, useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { importLogRepository } from '@/shared/lib/indexeddb/repositories/importLogRepository';
import { ImportReportCard } from './ImportReportCard';
import { SettingsBackButton } from './SettingsBackButton';
import type { ImportReport } from '@/shared/types/import.types';

export function ImportReportsPage() {
  const [reports, setReports] = useState<ImportReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const logs = await importLogRepository.getRecent(50);
        setReports(logs);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="İçe Aktarma Raporları"
        backButton={<SettingsBackButton />}
      />
      <div className="space-y-4 p-4">
        {isLoading ? (
          <LoadingSpinner label="Raporlar yükleniyor..." />
        ) : reports.length === 0 ? (
          <EmptyState
            title="Henüz rapor yok"
            description="Ürün, cari veya stok içe aktarma işlemi yaptığınızda raporlar burada görünür."
          />
        ) : (
          reports.map((report) => (
            <ImportReportCard key={report.id} report={report} detailed />
          ))
        )}

        {!isLoading && reports.length > 0 ? (
          <Card padding="md">
            <p className="text-center text-xs text-brand-gray-400">
              Son {reports.length} içe aktarma raporu gösteriliyor
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
