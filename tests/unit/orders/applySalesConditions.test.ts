import { describe, expect, it } from 'vitest';
import { applySalesConditionItemsToLines, parseSalesConditionItem } from '@/features/orders/utils/applySalesConditions';
import { buildDraftLine } from '@/features/orders/utils/orderCalculations';
import type { SalesConditionItemResult } from '@/features/orders/utils/applySalesConditions';

function result(
  partial: Partial<SalesConditionItemResult>,
): SalesConditionItemResult {
  return {
    logicalRef: '100',
    barcode: '8691',
    priceSource: 'list',
    listPrice: 100,
    discount1: '10',
    discount2: '',
    discount3: '',
    discount4: '',
    discount5: '',
    discountRate1: 10,
    discountRate2: 0,
    discountRate3: 0,
    discountRate4: 0,
    discountRate5: 0,
    netPrice: 90,
    ...partial,
  };
}

describe('applySalesConditionItemsToLines', () => {
  it('reads all discount rates from Logo SQL-style aliases when needed', () => {
    const parsed = parseSalesConditionItem({
      logicalRef: '100',
      barcode: '8691',
      listPrice: 100,
      netPrice: 68.4,
      ISKONTO_1: 10,
      ISKONTO_2: 20,
    });

    expect(parsed?.discountRate1).toBe(10);
    expect(parsed?.discountRate2).toBe(20);
  });

  it('does not change unmatched lines', () => {
    const line = buildDraftLine(
      {
        id: 'p1',
        sku: 'SKU',
        name: 'Ürün',
        barcode: '111',
        erpId: '1',
        unit: 'Adet',
        listPrice: 50,
        vatRate: 20,
        stockQuantity: 3,
      },
      2,
    );
    const next = applySalesConditionItemsToLines([line], [
      result({ logicalRef: '999', barcode: '000' }),
    ]);
    expect(next.matchedCount).toBe(0);
    expect(next.lines[0].unitPrice).toBe(50);
    expect(next.lines[0].salesConditionsApplied).toBe(false);
  });

  it('writes API net price and keeps list price for display', () => {
    const line = buildDraftLine(
      {
        id: 'p1',
        sku: 'SKU',
        name: 'Ürün',
        barcode: '8691',
        erpId: '100',
        unit: 'Adet',
        listPrice: 80,
        vatRate: 20,
        stockQuantity: 3,
      },
      2,
    );
    const next = applySalesConditionItemsToLines([line], [
      result({ listPrice: 100, netPrice: 85.5, priceSource: 'customer' }),
    ]);
    expect(next.matchedCount).toBe(1);
    expect(next.lines[0].listUnitPrice).toBe(100);
    expect(next.lines[0].unitPrice).toBe(85.5);
    expect(next.lines[0].salesConditionsApplied).toBe(true);
    expect(next.lines[0].priceSource).toBe('customer');
    expect(next.lines[0].lineTotal).toBeCloseTo(171, 4);
    expect(next.lines[0].discountRate).toBe(0);
  });

  it('skips API rows that report a missing price error', () => {
    const line = buildDraftLine(
      {
        id: 'p1',
        sku: 'SKU',
        name: 'Ürün',
        barcode: '8691',
        erpId: '100',
        unit: 'Adet',
        listPrice: 80,
        vatRate: 20,
        stockQuantity: 3,
      },
      2,
    );
    const parsed = parseSalesConditionItem({
      logicalRef: '100',
      barcode: '8691',
      listPrice: null,
      netPrice: null,
      error: 'Geçerli satış fiyatı bulunamadı (PRCLIST, PTYPE=2, tarih aralığı).',
    });
    expect(parsed).toBeNull();
    const next = applySalesConditionItemsToLines([line], parsed ? [parsed] : []);
    expect(next.matchedCount).toBe(0);
    expect(next.lines[0].unitPrice).toBe(80);
    expect(next.lines[0].salesConditionsApplied).toBe(false);
  });

  it('writes API listPrice onto a line whose catalog listPrice is 0', () => {
    const line = buildDraftLine(
      {
        id: 'p1',
        sku: 'SKU',
        name: 'Ürün',
        barcode: '8691',
        erpId: '100',
        unit: 'Adet',
        listPrice: 0,
        vatRate: 20,
        stockQuantity: 3,
      },
      1,
    );
    const next = applySalesConditionItemsToLines([line], [
      result({ listPrice: 2830, netPrice: 2044.68 }),
    ]);
    expect(next.matchedCount).toBe(1);
    expect(next.lines[0].listUnitPrice).toBe(2830);
    expect(next.lines[0].unitPrice).toBe(2044.68);
    expect(next.lines[0].salesConditionsApplied).toBe(true);
  });
});
