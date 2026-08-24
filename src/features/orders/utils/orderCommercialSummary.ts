import type { OrderDraftLine } from '@/features/orders/types/orderFlow.types';
import { roundMoney } from '@/features/orders/utils/salesConditionMath';

export interface OrderCommercialSummary {
  itemCount: number;
  listTotal: number;
  discountTotal: number | null;
  netTotal: number | null;
  vatTotal: number | null;
  grandTotalWithVat: number | null;
  salesConditionsApplied: boolean;
  vatUnavailable: boolean;
}

function isPositivePrice(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function listUnitPrice(line: OrderDraftLine): number {
  if (isPositivePrice(line.listUnitPrice)) return line.listUnitPrice;
  if (!line.salesConditionsApplied && isPositivePrice(line.unitPrice)) {
    return line.unitPrice;
  }
  return 0;
}

function hasVatRate(vatRate: unknown): vatRate is number {
  return typeof vatRate === 'number' && Number.isFinite(vatRate) && vatRate >= 0;
}

function lineListAmount(line: OrderDraftLine): number {
  return listUnitPrice(line) * line.quantity;
}

function lineNetAmount(line: OrderDraftLine): number {
  return line.unitPrice * line.quantity;
}

/**
 * Display totals for the order screen. Does not recompute Logo discounts.
 * Net / discount / VAT use only lines with salesConditionsApplied.
 */
export function calculateCommercialSummary(
  lines: readonly OrderDraftLine[],
): OrderCommercialSummary {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const listTotal = lines.reduce((sum, line) => sum + lineListAmount(line), 0);
  const applied = lines.filter((line) => line.salesConditionsApplied);

  if (applied.length === 0) {
    return {
      itemCount,
      listTotal,
      discountTotal: null,
      netTotal: null,
      vatTotal: null,
      grandTotalWithVat: null,
      salesConditionsApplied: false,
      vatUnavailable: false,
    };
  }

  const appliedListTotal = applied.reduce(
    (sum, line) => sum + lineListAmount(line),
    0,
  );
  const netTotal = applied.reduce((sum, line) => sum + lineNetAmount(line), 0);
  const discountTotal = Math.max(0, appliedListTotal - netTotal);
  const vatUnavailable = applied.some((line) => !hasVatRate(line.vatRate));

  if (vatUnavailable) {
    return {
      itemCount,
      listTotal,
      discountTotal,
      netTotal,
      vatTotal: null,
      grandTotalWithVat: null,
      salesConditionsApplied: true,
      vatUnavailable: true,
    };
  }

  const vatTotal = applied.reduce((sum, line) => {
    return sum + roundMoney(lineNetAmount(line) * (line.vatRate / 100));
  }, 0);

  return {
    itemCount,
    listTotal,
    discountTotal,
    netTotal,
    vatTotal,
    grandTotalWithVat: netTotal + vatTotal,
    salesConditionsApplied: true,
    vatUnavailable: false,
  };
}
