import type { OrderDraftLine } from '@/features/orders/types/orderFlow.types';
import { recalculateLine } from '@/features/orders/utils/orderCalculations';

export interface SalesConditionItemResult {
  logicalRef: string;
  barcode: string;
  priceSource: 'customer' | 'list';
  listPrice: number;
  discount1: string;
  discount2: string;
  discount3: string;
  discount4: string;
  discount5: string;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
  discountRate4: number;
  discountRate5: number;
  netPrice: number;
}

function asTrimmed(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function asNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** LogoApi has historically returned both camelCase and SQL-style aliases. */
function readRate(row: Record<string, unknown>, ordinal: 1 | 2 | 3 | 4 | 5): number {
  return asNumber(
    row[`discountRate${ordinal}`] ?? row[`ISKONTO_${ordinal}`],
  );
}

export function parseSalesConditionItem(raw: unknown): SalesConditionItemResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (asTrimmed(row.error)) return null;
  const logicalRef = asTrimmed(row.logicalRef);
  const barcode = asTrimmed(row.barcode);
  if (!logicalRef && !barcode) return null;
  const listPrice = asNumber(row.listPrice, Number.NaN);
  const netPrice = asNumber(row.netPrice, Number.NaN);
  if (!Number.isFinite(listPrice) || listPrice <= 0 || !Number.isFinite(netPrice)) {
    return null;
  }
  const sourceRaw = asTrimmed(row.priceSource);
  const priceSource: 'customer' | 'list' =
    sourceRaw === 'customer' ? 'customer' : 'list';
  return {
    logicalRef,
    barcode,
    priceSource,
    listPrice,
    discount1: asTrimmed(row.discount1),
    discount2: asTrimmed(row.discount2),
    discount3: asTrimmed(row.discount3),
    discount4: asTrimmed(row.discount4),
    discount5: asTrimmed(row.discount5),
    discountRate1: readRate(row, 1),
    discountRate2: readRate(row, 2),
    discountRate3: readRate(row, 3),
    discountRate4: readRate(row, 4),
    discountRate5: readRate(row, 5),
    netPrice,
  };
}

function matchesLine(
  line: OrderDraftLine,
  item: SalesConditionItemResult,
): boolean {
  const erpId = (line.productErpId ?? '').trim();
  const barcode = (line.productBarcode ?? '').trim();
  if (erpId && item.logicalRef && erpId === item.logicalRef) return true;
  if (barcode && item.barcode && barcode === item.barcode) return true;
  return false;
}

export interface ApplySalesConditionsToLinesResult {
  lines: OrderDraftLine[];
  matchedCount: number;
}

/**
 * Applies API net prices onto draft lines. Does not call Logo.
 * Unmatched lines keep their current list price.
 */
export function applySalesConditionItemsToLines(
  lines: readonly OrderDraftLine[],
  items: readonly SalesConditionItemResult[],
): ApplySalesConditionsToLinesResult {
  let matchedCount = 0;
  const next = lines.map((line) => {
    const match = items.find((item) => matchesLine(line, item));
    if (!match) return line;
    matchedCount += 1;
    return recalculateLine({
      ...line,
      listUnitPrice: match.listPrice,
      unitPrice: match.netPrice,
      discountRates: [
        match.discountRate1,
        match.discountRate2,
        match.discountRate3,
        match.discountRate4,
        match.discountRate5,
      ].filter((rate) => rate > 0),
      discountRate: 0,
      salesConditionsApplied: true,
      priceSource: match.priceSource,
    });
  });
  return { lines: next, matchedCount };
}
