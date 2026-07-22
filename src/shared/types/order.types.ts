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
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  vatRate: number;
  lineTotal: number;
  sortOrder: number;
  unit?: string;
  erpId?: string;
}
