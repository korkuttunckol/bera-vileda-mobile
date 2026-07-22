import type { LocalOrder } from '@/shared/lib/indexeddb/db';

export interface OrderSyncStats {
  sent: number;
  pending: number;
  failed: number;
  sending: number;
}

export function computeOrderSyncStats(orders: LocalOrder[]): OrderSyncStats {
  const active = orders.filter((o) => !o.isDeleted);

  return {
    sent: active.filter((o) => o.orderSyncStatus === 'sent').length,
    pending: active.filter((o) => o.orderSyncStatus === 'pending_offline').length,
    failed: active.filter((o) => o.orderSyncStatus === 'failed').length,
    sending: active.filter((o) => o.orderSyncStatus === 'sending').length,
  };
}
