export interface OrderDraftLine {
  productId: string;
  productSku: string;
  productName: string;
  productBarcode?: string;
  /** Logo ITEMS.LOGICALREF when known. */
  productErpId?: string;
  unit: string;
  stockQuantity: number;
  quantity: number;
  /** Effective unit price (list until sales conditions are applied, then net). */
  unitPrice: number;
  /** Snapshot of list / base price shown before net price. */
  listUnitPrice?: number;
  /** Logo'nun kalem bazında uyguladığı iskonto oranları (ör. 20 + 5). */
  discountRates?: number[];
  discountRate: number;
  vatRate: number;
  lineTotal: number;
  salesConditionsApplied?: boolean;
  priceSource?: 'customer' | 'list';
}

export interface OrderDraft {
  step: OrderFlowStep;
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  branchId?: string;
  branchName?: string;
  lines: OrderDraftLine[];
  notes?: string;
}

export type OrderFlowStep =
  | 'customer'
  | 'branch'
  | 'products'
  | 'cart'
  | 'save';

export const ORDER_FLOW_STEPS: { key: OrderFlowStep; label: string }[] = [
  { key: 'customer', label: 'Müşteri' },
  { key: 'branch', label: 'Şube' },
  { key: 'products', label: 'Ürün' },
  { key: 'cart', label: 'Sepet' },
  { key: 'save', label: 'Kaydet' },
];
