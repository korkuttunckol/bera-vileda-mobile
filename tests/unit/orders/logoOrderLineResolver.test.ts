import { describe, expect, it } from 'vitest';
import {
  buildLogoProductCatalogIndex,
  resolveLogoOrderLine,
  resolveLogoOrderLines,
} from '@/features/orders/utils/logoOrderLineResolver';
import type { OrderLine } from '@/shared/types/order.types';
import type { Product } from '@/shared/types/product.types';

function makeProduct(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    localId: overrides.id,
    sku: '141111',
    name: 'Ürün',
    category: 'Genel',
    unit: 'Adet',
    barcode: '10',
    erpId: '58742',
    listPrice: 10,
    vatRate: 20,
    stockQuantity: 100,
    isActive: true,
    isDeleted: false,
    createdAt: 't0',
    updatedAt: 't0',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

function makeLine(overrides: Partial<OrderLine> = {}): OrderLine {
  return {
    id: 'line-1',
    orderId: 'ord-1',
    productId: 'prod-1',
    productSku: '141111',
    productName: 'Ürün',
    productNameAtOrder: 'Ürün',
    barcodeAtOrder: '10',
    erpId: '58742',
    quantity: 5,
    unitPrice: 10,
    discountRate: 0,
    vatRate: 20,
    lineTotal: 50,
    sortOrder: 0,
    unit: 'Adet',
    ...overrides,
  };
}

describe('logoOrderLineResolver', () => {
  it('A) erpId same, barcode same → matched with current barcode', () => {
    const product = makeProduct({ id: 'prod-1', erpId: '58742', barcode: '10' });
    const line = makeLine();
    const catalog = buildLogoProductCatalogIndex([product]);
    const result = resolveLogoOrderLine(line, catalog);

    expect(result.status).toBe('matched');
    if (result.status === 'matched') {
      expect(result.matchedBy).toBe('erpId');
      expect(result.barcode).toBe('10');
      expect(result.sku).toBe('141111');
      expect(result.erpId).toBe('58742');
      expect(result.quantity).toBe(5);
    }
  });

  it('B) erpId same, barcode changed → uses current Product.barcode (not snapshot)', () => {
    const product = makeProduct({
      id: 'prod-1',
      erpId: '58742',
      sku: '141111',
      barcode: '9',
    });
    const line = makeLine({
      erpId: '58742',
      productSku: '141111',
      barcodeAtOrder: '10',
      quantity: 5,
    });
    const result = resolveLogoOrderLine(
      line,
      buildLogoProductCatalogIndex([product]),
    );

    expect(result.status).toBe('matched');
    if (result.status === 'matched') {
      expect(result.matchedBy).toBe('erpId');
      expect(result.barcode).toBe('9');
      expect(result.quantity).toBe(5);
    }
    // G/H/I — snapshot unchanged
    expect(line.barcodeAtOrder).toBe('10');
    expect(line.productSku).toBe('141111');
    expect(line.quantity).toBe(5);
  });

  it('C) erpId same, sku changed on catalog → still matched by LOGICALREF', () => {
    const product = makeProduct({
      id: 'prod-1',
      erpId: '58742',
      sku: '999999',
      barcode: '9',
    });
    const line = makeLine({
      erpId: '58742',
      productSku: '141111',
      barcodeAtOrder: '10',
    });
    const result = resolveLogoOrderLine(
      line,
      buildLogoProductCatalogIndex([product]),
    );

    expect(result.status).toBe('matched');
    if (result.status === 'matched') {
      expect(result.matchedBy).toBe('erpId');
      expect(result.sku).toBe('999999');
      expect(result.barcode).toBe('9');
    }
    expect(line.productSku).toBe('141111');
  });

  it('D) no erpId on line, sku matches → matched by sku', () => {
    const product = makeProduct({
      id: 'prod-1',
      erpId: 'OTHER',
      sku: '141111',
      barcode: '22',
    });
    const line = makeLine({ erpId: undefined, productSku: '141111' });
    const result = resolveLogoOrderLine(
      line,
      buildLogoProductCatalogIndex([product]),
    );

    expect(result.status).toBe('matched');
    if (result.status === 'matched') {
      expect(result.matchedBy).toBe('sku');
      expect(result.barcode).toBe('22');
    }
  });

  it('E) only legacy barcodeAtOrder matches → barcode fallback', () => {
    const product = makeProduct({
      id: 'prod-2',
      erpId: '111',
      sku: 'OTHER-SKU',
      barcode: '10',
    });
    const line = makeLine({
      erpId: undefined,
      productSku: 'MISSING',
      barcodeAtOrder: '10',
    });
    const result = resolveLogoOrderLine(
      line,
      buildLogoProductCatalogIndex([product]),
    );

    expect(result.status).toBe('matched');
    if (result.status === 'matched') {
      expect(result.matchedBy).toBe('barcode');
      expect(result.barcode).toBe('10');
    }
  });

  it('F) no match → matching_pending (no delete / no mutate)', () => {
    const product = makeProduct({
      id: 'prod-x',
      erpId: '1',
      sku: 'X',
      barcode: 'Y',
    });
    const line = makeLine({
      erpId: '999',
      productSku: 'NOPE',
      barcodeAtOrder: 'NOPE',
      quantity: 5,
    });
    const snapshot = { ...line };
    const catalogProducts = [product];
    const productBefore = { ...product };

    const result = resolveLogoOrderLine(
      line,
      buildLogoProductCatalogIndex(catalogProducts),
    );

    expect(result.status).toBe('matching_pending');
    if (result.status === 'matching_pending') {
      expect(result.quantity).toBe(5);
      expect(result.lineId).toBe('line-1');
    }
    expect(line).toEqual(snapshot);
    expect(product).toEqual(productBefore);
  });

  it('G/H/I/J) resolveLogoOrderLines does not mutate lines or products', () => {
    const product = makeProduct({
      id: 'prod-1',
      erpId: '58742',
      barcode: '9',
      sku: '141111',
    });
    const line = makeLine({
      barcodeAtOrder: '10',
      productSku: '141111',
      quantity: 5,
    });
    const lineClone = structuredClone(line);
    const productClone = structuredClone(product);

    const results = resolveLogoOrderLines([line], [product]);
    expect(results[0]?.status).toBe('matched');
    if (results[0]?.status === 'matched') {
      expect(results[0].barcode).toBe('9');
    }

    expect(line.barcodeAtOrder).toBe(lineClone.barcodeAtOrder);
    expect(line.productSku).toBe(lineClone.productSku);
    expect(line.quantity).toBe(lineClone.quantity);
    expect(line.erpId).toBe(lineClone.erpId);
    expect(product.barcode).toBe(productClone.barcode);
    expect(product.sku).toBe(productClone.sku);
    expect(product.erpId).toBe(productClone.erpId);
    expect(product.stockQuantity).toBe(productClone.stockQuantity);
  });

  it('prefers erpId over sku/barcode when all could match different cards', () => {
    const byErp = makeProduct({
      id: 'a',
      erpId: '58742',
      sku: 'AAA',
      barcode: '111',
    });
    const bySku = makeProduct({
      id: 'b',
      erpId: '2',
      sku: '141111',
      barcode: '222',
    });
    const byBarcode = makeProduct({
      id: 'c',
      erpId: '3',
      sku: 'CCC',
      barcode: '10',
    });
    const line = makeLine({
      erpId: '58742',
      productSku: '141111',
      barcodeAtOrder: '10',
    });

    const result = resolveLogoOrderLine(
      line,
      buildLogoProductCatalogIndex([bySku, byBarcode, byErp]),
    );
    expect(result.status).toBe('matched');
    if (result.status === 'matched') {
      expect(result.matchedBy).toBe('erpId');
      expect(result.productId).toBe('a');
      expect(result.barcode).toBe('111');
    }
  });
});
