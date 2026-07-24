import { Card } from '@/shared/components/ui/Card';
import { OrderStatusBadge } from './OrderStatusBadge';
import { formatDate } from '@/shared/utils/cn';
import { cn } from '@/shared/utils/cn';
import type { Order } from '@/shared/types/order.types';

interface OrderCardProps {
  order: Order;
  onSelect?: (order: Order) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (order: Order) => void;
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

export function OrderCard({
  order,
  onSelect,
  selectable = false,
  selected = false,
  onToggleSelect,
}: OrderCardProps) {
  const syncMeta = formatSyncMeta(order);

  const handleToggleSelect = (): void => {
    onToggleSelect?.(order);
  };

  return (
    <Card
      padding="none"
      interactive={Boolean(onSelect) && !selectable}
      onClick={() => {
        if (selectable) {
          handleToggleSelect();
          return;
        }
        onSelect?.(order);
      }}
      className={cn(
        selectable && 'cursor-pointer',
        selectable && selected && 'border-brand-navy/40 bg-brand-navy/5 ring-2 ring-brand-navy/25',
      )}
    >
      <div className="flex items-stretch">
        {selectable ? (
          <div
            className="flex shrink-0 items-center px-3"
            onClick={(event) => { event.stopPropagation(); }}
          >
            <input
              type="checkbox"
              className="h-5 w-5 cursor-pointer rounded border-brand-gray-300 text-brand-navy focus:ring-brand-navy/20"
              checked={selected}
              onClick={(event) => { event.stopPropagation(); }}
              onChange={handleToggleSelect}
              aria-label={`${order.customerName} siparişini seç`}
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1 px-4 py-4 text-left">
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
      </div>
    </Card>
  );
}
