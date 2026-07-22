import { Card } from '@/shared/components/ui/Card';
import { OrderStatusBadge } from './OrderStatusBadge';
import { formatDate } from '@/shared/utils/cn';
import type { Order } from '@/shared/types/order.types';

interface OrderCardProps {
  order: Order;
  onSelect?: (order: Order) => void;
}

function formatOrderQuantitySummary(order: Order): string {
  const kalemLabel = `${String(order.lineCount)} Kalem`;
  if (order.itemCount != null) {
    return `${kalemLabel} • ${String(order.itemCount)} Adet`;
  }
  return kalemLabel;
}

function formatSyncMeta(order: Order): string | null {
  if (order.erpSyncedAt) {
    return `Senkronize: ${formatDate(order.erpSyncedAt)}`;
  }
  if (order.orderSyncStatus === 'sent' && order.updatedAt) {
    return `Gönderim: ${formatDate(order.updatedAt)}`;
  }
  if (order.orderSyncStatus === 'failed' && order.syncError) {
    return order.syncError;
  }
  return null;
}

export function OrderCard({ order, onSelect }: OrderCardProps) {
  const syncMeta = formatSyncMeta(order);

  return (
    <Card
      padding="none"
      interactive={Boolean(onSelect)}
      onClick={() => onSelect?.(order)}
    >
      <div className="px-4 py-4">
        <div className="space-y-1">
          <p className="truncate text-[16px] font-semibold leading-snug text-brand-navy">
            {order.customerName}
          </p>
          {order.branchName ? (
            <p className="truncate text-sm text-brand-gray-500">{order.branchName}</p>
          ) : null}
        </div>

        <p className="mt-3 text-sm font-medium text-brand-gray-600">
          {formatDate(order.orderDate)}
        </p>

        <p className="mt-1 text-sm text-brand-gray-500">
          {formatOrderQuantitySummary(order)}
        </p>

        <div className="mt-3 flex flex-col gap-1">
          <OrderStatusBadge status={order.orderSyncStatus} variant="inline" />
          {syncMeta ? (
            <p
              className={
                order.orderSyncStatus === 'failed'
                  ? 'truncate text-xs text-red-600'
                  : 'text-xs text-brand-gray-400'
              }
            >
              {syncMeta}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
