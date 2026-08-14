import { describe, expect, it } from 'vitest';
import { buildDraftLine } from '@/features/orders/utils/orderCalculations';
import {
  buildOrderLineFromDraft,
  resolveOrderLineBarcode,
  resolveOrderLineDisplayName,
} from '@/features/orders/utils/orderLineSnapshot';
import type { OrderLine } from '@/shared/types/order.types';
import type { Product } from '@/shared/types/product.types';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    sku: 'SKU-100',
    name: 'Orijinal Ad',
    category: 'Genel',
    unit: 'Adet',
    barcode: '869000111',
    erpId: 'LOGO-REF-9',
    listPrice: 25,
    vatRate: 20,
    stockQuantity: 40,
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedBy: 'u1',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

describe('order line product snapshot', () => {
  it('buildDraftLine captures productId, sku, barcode, name, erpId at add time', () => {
    const draft = buildDraftLine(makeProduct(), 3);
    expect(draft).toMatchObject({
      productId: 'prod-1',
      productSku: 'SKU-100',
      productName: 'Orijinal Ad',
      productBarcode: '869000111',
      productErpId: 'LOGO-REF-9',
      quantity: 3,
      stockQuantity: 40,
    });
  });

  it('createFromDraft path writes permanent snapshot fields on OrderLine', () => {
    const draft = buildDraftLine(makeProduct(), 2);
    const line = buildOrderLineFromDraft({
      orderId: 'ord-1',
      lineId: 'line-1',
      sortOrder: 0,
      draft,
    });

    expect(line.productId).toBe('prod-1');
    expect(line.productSku).toBe('SKU-100');
    expect(line.productName).toBe('Orijinal Ad');
    expect(line.productNameAtOrder).toBe('Orijinal Ad');
    expect(line.barcodeAtOrder).toBe('869000111');
    expect(line.erpId).toBe('LOGO-REF-9');
    expect(line.quantity).toBe(2);
  });

  it('changing live Product barcode/name/stock does not mutate OrderLine snapshot', () => {
    const product = makeProduct();
    const draft = buildDraftLine(product, 5);
    const line = buildOrderLineFromDraft({
      orderId: 'ord-1',
      lineId: 'line-1',
      sortOrder: 0,
      draft,
    });

    // Simulate Logo / Excel / PullSync mutating the catalog product in place
    product.barcode = '999-NEW-BARCODE';
    product.name = 'Yeni Ürün Adı';
    product.stockQuantity = 1;
    product.sku = 'SKU-CHANGED';
    product.erpId = 'OTHER-REF';

    expect(line.barcodeAtOrder).toBe('869000111');
    expect(line.productNameAtOrder).toBe('Orijinal Ad');
    expect(line.productName).toBe('Orijinal Ad');
    expect(line.productSku).toBe('SKU-100');
    expect(line.erpId).toBe('LOGO-REF-9');
    expect(line.quantity).toBe(5);
  });

  it('legacy OrderLine without new fields still resolves display safely', () => {
    const legacy: OrderLine = {
      id: 'old-line',
      orderId: 'old-ord',
      productId: 'p1',
      productSku: 'OLD-SKU',
      productName: 'Eski Sipariş Adı',
      quantity: 1,
      unitPrice: 10,
      discountRate: 0,
      vatRate: 20,
      lineTotal: 10,
      sortOrder: 0,
    };

    expect(resolveOrderLineDisplayName(legacy)).toBe('Eski Sipariş Adı');
    expect(resolveOrderLineBarcode(legacy)).toBeUndefined();
    expect(resolveOrderLineBarcode(legacy, ' live-bc ')).toBe('live-bc');
  });

  it('display helpers prefer snapshot over live catalog', () => {
    const line: OrderLine = {
      id: 'l1',
      orderId: 'o1',
      productId: 'p1',
      productSku: 'S1',
      productName: 'Legacy Name Field',
      productNameAtOrder: 'Snapshot Name',
      barcodeAtOrder: 'SNAP-BC',
      quantity: 1,
      unitPrice: 1,
      discountRate: 0,
      vatRate: 20,
      lineTotal: 1,
      sortOrder: 0,
    };

    expect(resolveOrderLineDisplayName(line)).toBe('Snapshot Name');
    expect(resolveOrderLineBarcode(line, 'LIVE-BC')).toBe('SNAP-BC');
  });
});
