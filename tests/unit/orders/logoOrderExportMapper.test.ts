import { describe, expect, it } from 'vitest';
import { mapOrderToLogoExport } from '@/features/orders/utils/logoOrderExportMapper';
import type { Customer } from '@/shared/types/customer.types';
import type { Order, OrderLine } from '@/shared/types/order.types';
import type { Product } from '@/shared/types/product.types';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-1',
    localId: 'ord-1',
    customerId: 'cust-1',
    customerName: 'AFM',
    customerCode: 'C001',
    branchId: 'br-1',
    branchName: 'DEPO',
    salesRepId: 'rep-1',
    status: 'submitted',
    orderSyncStatus: 'pending_offline',
    orderDate: '2026-08-14T12:00:00.000Z',
    notes: 'not-used-for-genexp1',
    subtotal: 50,
    discountTotal: 0,
    vatTotal: 10,
    grandTotal: 60,
    lineCount: 1,
    itemCount: 5,
    createdOffline: true,
    isDeleted: false,
    createdAt: 't',
    updatedAt: 't',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'pending',
    erpSyncStatus: 'none',
    localOrderNumber: 'LOCAL-ABC',
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

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust-1',
    localId: 'cust-1',
    code: 'C001',
    name: 'AFM',
    salesRepId: 'rep-1',
    isActive: true,
    isDeleted: false,
    source: 'excel',
    erpId: '1001',
    createdAt: 't',
    updatedAt: 't',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    localId: 'prod-1',
    sku: '141111',
    name: 'Ürün',
    category: 'Genel',
    unit: 'Adet',
    barcode: '9',
    erpId: '58742',
    listPrice: 10,
    vatRate: 20,
    stockQuantity: 100,
    isActive: true,
    isDeleted: false,
    createdAt: 't',
    updatedAt: 't',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

describe('mapOrderToLogoExport', () => {
  it('maps ORFICHE/ORFLINE with fixed Logo constants and branchName', () => {
    const order = makeOrder();
    const line = makeLine();
    const result = mapOrderToLogoExport({
      order,
      lines: [line],
      customers: [makeCustomer()],
      products: [makeProduct()],
      provisionalOrficheLogicalRef: 555,
    });

    expect(result.status).toBe('mapped');
    if (result.status !== 'mapped') return;

    expect(result.orfiche).toMatchObject({
      LOGICALREF: 555,
      TRCODE: 1,
      CLIENTREF: 1001,
      SOURCEINDEX: 0,
      SPECODE: 'DEPO',
      GENEXP1: 'DEPO',
      CUSTORDNO: 'LOCAL-ABC',
    });

    expect(result.orflines).toHaveLength(1);
    expect(result.orflines[0]).toMatchObject({
      ORDFICHEREF: 555,
      LINENO_: 1,
      STOCKREF: 58742,
      CLIENTREF: 1001,
      AMOUNT: 5,
      PRICE: 10,
      TOTAL: 50,
      SHIPPEDAMOUNT: 0,
      UOMREF: 24,
      USREF: 7,
      LINETYPE: 0,
      SOURCEINDEX: 0,
      TRCODE: 1,
      currentBarcode: '9',
      currentSku: '141111',
      beraLineId: 'line-1',
    });
  });

  it('uses current Product.barcode from resolver when CODE changed (snapshot stays 10)', () => {
    const line = makeLine({ barcodeAtOrder: '10', erpId: '58742' });
    const product = makeProduct({ erpId: '58742', barcode: '9' });
    const lineBefore = structuredClone(line);

    const result = mapOrderToLogoExport({
      order: makeOrder(),
      lines: [line],
      customers: [makeCustomer()],
      products: [product],
    });

    expect(result.status).toBe('mapped');
    if (result.status === 'mapped') {
      expect(result.orflines[0]?.currentBarcode).toBe('9');
    }
    expect(line.barcodeAtOrder).toBe(lineBefore.barcodeAtOrder);
    expect(line.productSku).toBe(lineBefore.productSku);
    expect(line.quantity).toBe(lineBefore.quantity);
    expect(line.erpId).toBe(lineBefore.erpId);
  });

  it('returns matching_pending when customer erpId missing (does not delete order)', () => {
    const result = mapOrderToLogoExport({
      order: makeOrder(),
      lines: [makeLine()],
      customers: [makeCustomer({ erpId: undefined })],
      products: [makeProduct()],
    });
    expect(result.status).toBe('matching_pending');
    if (result.status === 'matching_pending') {
      expect(result.details[0]?.reason).toBe('customer_erpId_missing');
    }
  });

  it('returns matching_pending when product cannot be resolved', () => {
    const result = mapOrderToLogoExport({
      order: makeOrder(),
      lines: [
        makeLine({
          erpId: '999',
          productSku: 'NOPE',
          barcodeAtOrder: 'NOPE',
        }),
      ],
      customers: [makeCustomer()],
      products: [makeProduct()],
    });
    expect(result.status).toBe('matching_pending');
    if (result.status === 'matching_pending') {
      expect(result.details.some((d) => d.reason === 'line_matching_pending')).toBe(
        true,
      );
    }
  });

  it('returns matching_pending when matched product has no erpId for STOCKREF', () => {
    const result = mapOrderToLogoExport({
      order: makeOrder(),
      lines: [makeLine({ erpId: undefined, productSku: '141111' })],
      customers: [makeCustomer()],
      products: [makeProduct({ erpId: undefined, sku: '141111' })],
    });
    expect(result.status).toBe('matching_pending');
    if (result.status === 'matching_pending') {
      expect(result.details[0]?.reason).toBe('product_erpId_missing');
    }
  });

  it('does not mutate customer or product catalogs', () => {
    const customer = makeCustomer();
    const product = makeProduct({ barcode: '9' });
    const customerClone = structuredClone(customer);
    const productClone = structuredClone(product);

    mapOrderToLogoExport({
      order: makeOrder(),
      lines: [makeLine()],
      customers: [customer],
      products: [product],
    });

    expect(customer).toEqual(customerClone);
    expect(product).toEqual(productClone);
  });
});
