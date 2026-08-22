export interface OrderDraftLine {
  productId: string;
  /** PRODUCERCODE at add-to-cart time */
  productSku: string;
  /** NAME at add-to-cart time */
  productName: string;
  /** CODE / barcode at add-to-cart time */
  productBarcode?: string;
  /** Product erpId / Logo LOGICALREF at add-to-cart time */
  productErpId?: string;
  unit: string;
  stockQuantity: number;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  vatRate: number;
  lineTotal: number;
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
