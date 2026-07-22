import type { OrderSyncStatus } from '@/shared/types/order.types';
import { ORDER_SYNC_STATUS_LABELS } from '@/shared/types/order.types';
import { cn } from '@/shared/utils/cn';

interface OrderStatusBadgeProps {
  status: OrderSyncStatus;
  className?: string;
  variant?: 'pill' | 'inline';
}

const statusStyles: Record<OrderSyncStatus, string> = {
  pending_offline: 'bg-amber-50 text-amber-800',
  sending: 'bg-blue-50 text-blue-800',
  sent: 'bg-emerald-50 text-emerald-800',
  failed: 'bg-red-50 text-red-700',
};

const dotStyles: Record<OrderSyncStatus, string> = {
  pending_offline: 'bg-amber-500',
  sending: 'bg-blue-500',
  sent: 'bg-emerald-500',
  failed: 'bg-red-500',
};

const inlineTextStyles: Record<OrderSyncStatus, string> = {
  pending_offline: 'text-amber-800',
  sending: 'text-blue-800',
  sent: 'text-emerald-800',
  failed: 'text-red-700',
};

export function OrderStatusBadge({
  status,
  className,
  variant = 'pill',
}: OrderStatusBadgeProps) {
  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-2 text-sm font-semibold',
          inlineTextStyles[status],
          className,
        )}
      >
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', dotStyles[status])}
          aria-hidden
        />
        {ORDER_SYNC_STATUS_LABELS[status]}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        statusStyles[status],
        className,
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotStyles[status])}
        aria-hidden
      />
      {ORDER_SYNC_STATUS_LABELS[status]}
    </span>
  );
}
