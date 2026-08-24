import { describe, expect, it } from 'vitest';
import { buildDraftLine } from '@/features/orders/utils/orderCalculations';
import { calculateCommercialSummary } from '@/features/orders/utils/orderCommercialSummary';
import type { OrderDraftLine } from '@/features/orders/types/orderFlow.types';

function line(
  overrides: Partial<OrderDraftLine> & { listPrice?: number; qty?: number },
): OrderDraftLine {
  const { listPrice, qty, ...rest } = overrides;
  const draft = buildDraftLine(
    {
      id: rest.productId ?? 'p1',
      sku: 'SKU',
      name: 'Ürün',
      barcode: '8691',
      erpId: '100',
      unit: 'Adet',
      listPrice: listPrice ?? 100,
      vatRate: rest.vatRate ?? 20,
      stockQuantity: 10,
    },
    qty ?? rest.quantity ?? 1,
  );
  return { ...draft, ...rest };
}

describe('calculateCommercialSummary', () => {
  it('sums quantity and list totals before sales conditions', () => {
    const summary = calculateCommercialSummary([
      line({ productId: 'a', qty: 2, listPrice: 100 }),
      line({ productId: 'b', qty: 3, listPrice: 50 }),
    ]);
    expect(summary.itemCount).toBe(5);
    expect(summary.listTotal).toBe(350);
    expect(summary.salesConditionsApplied).toBe(false);
    expect(summary.netTotal).toBeNull();
    expect(summary.discountTotal).toBeNull();
    expect(summary.vatTotal).toBeNull();
    expect(summary.grandTotalWithVat).toBeNull();
    expect(summary.vatUnavailable).toBe(false);
  });

  it('does not invent net from list or discountRate before apply', () => {
    const summary = calculateCommercialSummary([
      line({ qty: 2, listPrice: 100, discountRate: 10, lineTotal: 180 }),
    ]);
    expect(summary.netTotal).toBeNull();
    expect(summary.discountTotal).toBeNull();
  });

  it('uses API unitPrice as net after sales conditions, without recomputing rates', () => {
    const summary = calculateCommercialSummary([
      line({
        qty: 2,
        listUnitPrice: 260,
        unitPrice: 152,
        discountRate: 0,
        salesConditionsApplied: true,
        vatRate: 20,
      }),
    ]);
    expect(summary.salesConditionsApplied).toBe(true);
    expect(summary.listTotal).toBe(520);
    expect(summary.netTotal).toBe(304);
    expect(summary.discountTotal).toBe(216);
    expect(summary.vatTotal).toBe(60.8);
    expect(summary.grandTotalWithVat).toBe(364.8);
  });

  it('uses API list and net on a line whose catalog list price was 0', () => {
    const summary = calculateCommercialSummary([
      line({
        qty: 1,
        listPrice: 0,
        listUnitPrice: 2830,
        unitPrice: 2044.68,
        salesConditionsApplied: true,
        vatRate: 20,
      }),
    ]);
    expect(summary.itemCount).toBe(1);
    expect(summary.listTotal).toBe(2830);
    expect(summary.netTotal).toBe(2044.68);
    expect(summary.discountTotal).toBeCloseTo(785.32, 2);
    expect(summary.vatTotal).toBe(408.94);
    expect(summary.grandTotalWithVat).toBeCloseTo(2453.62, 2);
  });

  it('clamps discount at zero when net exceeds list', () => {
    const summary = calculateCommercialSummary([
      line({
        qty: 1,
        listUnitPrice: 80,
        unitPrice: 100,
        salesConditionsApplied: true,
        vatRate: 20,
      }),
    ]);
    expect(summary.discountTotal).toBe(0);
    expect(summary.netTotal).toBe(100);
  });

  it('rounds VAT per line to money precision', () => {
    const summary = calculateCommercialSummary([
      line({
        productId: 'a',
        qty: 1,
        listUnitPrice: 1.13,
        unitPrice: 1.13,
        salesConditionsApplied: true,
        vatRate: 20,
      }),
      line({
        productId: 'b',
        qty: 1,
        listUnitPrice: 1.13,
        unitPrice: 1.13,
        salesConditionsApplied: true,
        vatRate: 20,
      }),
    ]);
    // Per line: 1.13 * 0.20 = 0.226 → 0.23; sum = 0.46 (not 0.45 from 2.26 * 0.20)
    expect(summary.vatTotal).toBe(0.46);
    expect(summary.netTotal).toBeCloseTo(2.26, 10);
    expect(summary.grandTotalWithVat).toBeCloseTo(2.72, 10);
  });

  it('does not default VAT when the rate is missing; skips VAT totals', () => {
    const summary = calculateCommercialSummary([
      line({
        qty: 1,
        listUnitPrice: 100,
        unitPrice: 90,
        salesConditionsApplied: true,
        vatRate: Number.NaN,
      }),
    ]);
    expect(summary.netTotal).toBe(90);
    expect(summary.discountTotal).toBe(10);
    expect(summary.vatUnavailable).toBe(true);
    expect(summary.vatTotal).toBeNull();
    expect(summary.grandTotalWithVat).toBeNull();
  });

  it('treats 0% VAT as present and calculates zero tax', () => {
    const summary = calculateCommercialSummary([
      line({
        qty: 2,
        listUnitPrice: 50,
        unitPrice: 40,
        salesConditionsApplied: true,
        vatRate: 0,
      }),
    ]);
    expect(summary.vatUnavailable).toBe(false);
    expect(summary.vatTotal).toBe(0);
    expect(summary.grandTotalWithVat).toBe(80);
  });

  it('computes net only from applied lines; list total still includes all lines', () => {
    const summary = calculateCommercialSummary([
      line({
        productId: 'applied',
        qty: 1,
        listUnitPrice: 100,
        unitPrice: 80,
        salesConditionsApplied: true,
        vatRate: 20,
      }),
      line({
        productId: 'pending',
        qty: 2,
        listPrice: 50,
        salesConditionsApplied: false,
        vatRate: 20,
      }),
    ]);
    expect(summary.listTotal).toBe(200);
    expect(summary.netTotal).toBe(80);
    expect(summary.discountTotal).toBe(20);
    expect(summary.vatTotal).toBe(16);
    expect(summary.grandTotalWithVat).toBe(96);
  });
});
