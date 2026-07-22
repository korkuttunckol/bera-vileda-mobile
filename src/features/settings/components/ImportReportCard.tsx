import type { ImportReport } from '@/shared/types/import.types';
import { IMPORT_TYPE_LABELS } from '@/shared/types/import.types';
import { ImportResultSummary } from './ImportResultSummary';

interface ImportReportCardProps {
  report: ImportReport;
  detailed?: boolean;
}

export function ImportReportCard({ report }: ImportReportCardProps) {
  const date = new Date(report.completedAt).toLocaleString('tr-TR');

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-brand-gray-500">
        {IMPORT_TYPE_LABELS[report.type]} · {report.fileName} · {date}
      </p>
      <ImportResultSummary report={report} />
    </div>
  );
}
