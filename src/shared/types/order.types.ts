import type { BaseEntity } from './base.types';

/** İş mantığı durumu (ERP/onay akışı için) */
export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'erp_pending'
  | 'erp_synced'
  | 'cancelled';

/** Kullanıcıya gösterilen senkronizasyon durumu */
export type OrderSyncStatus =
  | 'pending_offline'
  | 'sending'
  | 'sent'
  | 'failed';

export const ORDER_SYNC_STATUS_LABELS: Record<OrderSyncStatus, string> = {
  pending_offline: 'Bekliyor (Offline)',
  sending: 'Gönderiliyor',
  sent: 'Gönderildi',
  failed: 'Hatalı',
};

export type OrderHistoryFilter = 'all' | 'pending' | 'sent' | 'failed';

export type ErpSyncStatus = 'none' | 'pending' | 'synced' | 'failed';

export interface Order extends BaseEntity {
  orderNumber?: string;
  localOrderNumber?: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  branchId?: string;
  branchName?: string;
  salesRepId: string;
  status: OrderStatus;
  orderSyncStatus: OrderSyncStatus;
  orderDate: string;
  deliveryDate?: string;
  notes?: string;
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  lineCount: number;
  /** Toplam ürün adedi (kalem miktarları toplamı) */
  itemCount?: number;
  createdOffline: boolean;
  isDeleted: boolean;
  deviceId?: string;
  erpId?: string;
  erpSyncStatus: ErpSyncStatus;
  erpSyncError?: string;
  erpSyncedAt?: string;
  syncError?: string;
}

export interface OrderLine {
  id: string;
  orderId: string;
  productId: string;
  /** Snapshot: PRODUCERCODE / sku at order time */
  productSku: string;
  /**
   * Snapshot: product display name at order time (legacy field; always written).
   * Prefer `productNameAtOrder` when present for explicit snapshot reads.
   */
  productName: string;
  /**
   * Explicit name snapshot at order time (same value as productName on new orders).
   * Undefined on legacy lines — fall back to productName.
   */
  productNameAtOrder?: string;
  /** Snapshot: CODE / barcode at order time. Undefined on legacy lines. */
  barcodeAtOrder?: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  vatRate: number;
  lineTotal: number;
  sortOrder: number;
  unit?: string;
  /** Snapshot: product erpId / Logo LOGICALREF at order time */
  erpId?: string;
}
