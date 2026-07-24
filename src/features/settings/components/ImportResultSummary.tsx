import { Card } from '@/shared/components/ui/Card';
import type {
  ImportReport,
  ImportReportError,
  ImportType,
} from '@/shared/types/import.types';
import { cn } from '@/shared/utils/cn';

interface ImportResultSummaryProps {
  report: ImportReport;
}

interface FieldLabels {
  code: string;
  name: string;
  barcode?: string;
}

const ERROR_FIELD_LABELS: Record<ImportType, FieldLabels> = {
  customers: { code: 'Cari Kodu', name: 'Cari Adı' },
  products: { code: 'Ürün Kodu', name: 'Ürün Adı', barcode: 'Barkod' },
  stock: { code: 'PRODUCERCODE', name: 'Ürün Adı', barcode: 'CODE (Barkod)' },
};

function resolveErrorCode(error: ImportReportError): string | undefined {
  return error.code ?? error.identifier;
}

function isNotFoundError(error: ImportReportError): boolean {
  return error.category === 'not_found';
}

export function ImportResultSummary({ report }: ImportResultSummaryProps) {
  const fieldLabels = ERROR_FIELD_LABELS[report.type];
  const date = new Date(report.completedAt).toLocaleString('tr-TR');
  const failedErrors = report.errors.filter((error) => !isNotFoundError(error));
  const notFoundErrors = report.errors.filter(isNotFoundError);
  const hasIssues = report.failed > 0 || report.notFound > 0;

  return (
    <Card padding="md" className="space-y-5">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-800">
          🟢 İçe Aktarma Tamamlandı
        </p>
        {hasIssues ? (
          <p className="mt-1 text-xs text-emerald-700/80">
            Bazı satırlar atlandı veya bulunamadı; aşağıdaki özet ve ayrıntılı
            listeleri inceleyin.
          </p>
        ) : null}
      </div>

      <div className="space-y-2 text-sm">
        <SummaryRow label="Toplam Okunan Kayıt" value={report.totalRows} />
        <SummaryRow label="Başarıyla Eklenen" value={report.created} highlight="green" />
        <SummaryRow label="Güncellenen" value={report.updated} />
        <SummaryRow
          label="Hatalı"
          value={report.failed}
          highlight={report.failed > 0 ? 'red' : undefined}
        />
        {report.notFound > 0 ? (
          <SummaryRow label="Bulunamayan" value={report.notFound} highlight="amber" />
        ) : null}
      </div>

      <p className="text-xs text-brand-gray-400">
        {report.fileName} · {date}
      </p>

      {failedErrors.length > 0 ? (
        <ImportErrorList
          title="Hatalı Kayıtlar"
          errors={failedErrors}
          fieldLabels={fieldLabels}
          variant="failed"
        />
      ) : null}

      {notFoundErrors.length > 0 ? (
        <ImportErrorList
          title="Bulunamayan Kayıtlar"
          errors={notFoundErrors}
          fieldLabels={fieldLabels}
          variant="not_found"
          showStockMatchDetails={report.type === 'stock'}
        />
      ) : null}
    </Card>
  );
}

function ImportErrorList({
  title,
  errors,
  fieldLabels,
  variant,
  showStockMatchDetails = false,
}: {
  title: string;
  errors: ImportReportError[];
  fieldLabels: FieldLabels;
  variant: 'failed' | 'not_found';
  showStockMatchDetails?: boolean;
}) {
  const isNotFound = variant === 'not_found';

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-brand-navy">{title}</h3>
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {errors.map((error, idx) => {
          const code = resolveErrorCode(error);
          return (
            <div
              key={`${variant}-${String(error.row)}-${String(idx)}`}
              className={cn(
                'rounded-xl border p-3 text-sm',
                isNotFound
                  ? 'border-amber-200/80 bg-amber-50/80'
                  : 'border-red-200/80 bg-red-50/80',
              )}
            >
              <dl className="space-y-1.5">
                <ErrorDetail
                  label="Satır"
                  value={String(error.row)}
                  variant={variant}
                />
                {code ? (
                  <ErrorDetail label={fieldLabels.code} value={code} variant={variant} />
                ) : null}
                {fieldLabels.barcode && (error.barcode || showStockMatchDetails) ? (
                  <ErrorDetail
                    label={fieldLabels.barcode}
                    value={error.barcode ?? '(boş)'}
                    variant={variant}
                  />
                ) : null}
                {error.name ? (
                  <ErrorDetail label={fieldLabels.name} value={error.name} variant={variant} />
                ) : null}
                {error.matchInfo ? (
                  <ErrorDetail
                    label="Eşleştirme"
                    value={error.matchInfo}
                    variant={variant}
                    multiline
                  />
                ) : null}
                <ErrorDetail label="Hata" value={error.message} variant={variant} multiline />
                {error.suggestion ? (
                  <ErrorDetail
                    label="Öneri"
                    value={error.suggestion}
                    variant={variant}
                    multiline
                  />
                ) : null}
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: 'green' | 'red' | 'amber';
}) {
  const valueColors = {
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
  } as const;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-gray-100 py-2 last:border-0">
      <span className="text-brand-gray-600">{label}</span>
      <span
        className={cn(
          'font-semibold tabular-nums text-brand-navy',
          highlight ? valueColors[highlight] : undefined,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ErrorDetail({
  label,
  value,
  variant,
  multiline,
}: {
  label: string;
  value: string;
  variant: 'failed' | 'not_found';
  multiline?: boolean;
}) {
  const labelClass =
    variant === 'not_found' ? 'text-amber-900/80' : 'text-red-800/80';
  const valueClass = variant === 'not_found' ? 'text-amber-900' : 'text-red-700';

  return (
    <div
      className={cn(
        'flex gap-2',
        multiline ? 'flex-col gap-0.5' : 'items-start justify-between',
      )}
    >
      <dt className={cn('shrink-0 text-xs font-medium', labelClass)}>{label}</dt>
      <dd
        className={cn(
          'text-sm',
          valueClass,
          multiline ? 'leading-relaxed' : 'text-right font-medium',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
