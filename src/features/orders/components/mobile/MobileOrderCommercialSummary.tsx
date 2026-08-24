import { formatCurrency, cn } from '@/shared/utils/cn';
import type { OrderCommercialSummary } from '@/features/orders/utils/orderCommercialSummary';

const PENDING_LABEL = 'Satış koşulları uygulanmadı';
const VAT_MISSING_LABEL = 'KDV oranı yok';

interface MobileOrderCommercialSummaryProps {
  summary: OrderCommercialSummary;
}

function SummaryRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-brand-gray-500">{label}</dt>
      <dd
        className={cn(
          'text-right text-sm tabular-nums text-brand-navy',
          emphasize && 'font-semibold',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function moneyOrPending(
  amount: number | null,
  applied: boolean,
): string {
  if (!applied || amount === null) return PENDING_LABEL;
  return formatCurrency(amount);
}

export function MobileOrderCommercialSummary({
  summary,
}: MobileOrderCommercialSummaryProps) {
  const vatValue = !summary.salesConditionsApplied
    ? PENDING_LABEL
    : summary.vatUnavailable || summary.vatTotal === null
      ? VAT_MISSING_LABEL
      : formatCurrency(summary.vatTotal);
  const grandValue = !summary.salesConditionsApplied
    ? PENDING_LABEL
    : summary.vatUnavailable || summary.grandTotalWithVat === null
      ? VAT_MISSING_LABEL
      : formatCurrency(summary.grandTotalWithVat);

  return (
    <dl className="space-y-1.5 border-t border-brand-gray-100 pt-3">
      <SummaryRow label="Toplam Adet" value={String(summary.itemCount)} />
      <SummaryRow
        label="Liste Toplamı"
        value={formatCurrency(summary.listTotal)}
      />
      <SummaryRow
        label="Toplam İndirim"
        value={moneyOrPending(summary.discountTotal, summary.salesConditionsApplied)}
      />
      <SummaryRow
        label="Net Toplam"
        value={moneyOrPending(summary.netTotal, summary.salesConditionsApplied)}
      />
      <SummaryRow label="KDV" value={vatValue} />
      <SummaryRow
        label="KDV Dahil Toplam"
        value={grandValue}
        emphasize
      />
    </dl>
  );
}
