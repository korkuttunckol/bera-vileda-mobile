import type { OrderDraftLine } from '@/features/orders/types/orderFlow.types';

export interface OrderTotals {
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  lineCount: number;
  itemCount: number;
}

export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountRate = 0,
): number {
  return quantity * unitPrice * (1 - discountRate / 100);
}

export function buildDraftLine(
  product: {
    id: string;
    sku: string;
    name: string;
    barcode?: string;
    erpId?: string;
    unit: string;
    listPrice: number;
    vatRate: number;
    stockQuantity: number;
  },
  quantity: number,
): OrderDraftLine {
  const barcode = product.barcode?.trim() || undefined;
  const erpId = product.erpId?.trim() || undefined;
  return {
    productId: product.id,
    productSku: product.sku,
    productName: product.name,
    productBarcode: barcode,
    productErpId: erpId,
    unit: product.unit,
    stockQuantity: product.stockQuantity,
    quantity,
    unitPrice: product.listPrice,
    vatRate: product.vatRate,
    discountRate: 0,
    lineTotal: calculateLineTotal(quantity, product.listPrice),
  };
}

export function recalculateLine(line: OrderDraftLine): OrderDraftLine {
  return {
    ...line,
    lineTotal: calculateLineTotal(line.quantity, line.unitPrice, line.discountRate),
  };
}

export function calculateOrderTotals(lines: OrderDraftLine[]): OrderTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const vatTotal = lines.reduce(
    (sum, l) => sum + l.lineTotal * (l.vatRate / 100),
    0,
  );
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  return {
    subtotal,
    vatTotal,
    grandTotal: subtotal + vatTotal,
    lineCount: lines.length,
    itemCount,
  };
}
