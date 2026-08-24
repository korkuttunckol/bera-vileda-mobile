import { cn } from '@/shared/utils/cn';
import { formatCustomerBalanceDisplay } from '../utils/customerBalanceDisplay';

interface CustomerBalanceBadgeProps {
  balance?: number;
  className?: string;
}

export function CustomerBalanceBadge({
  balance,
  className,
}: CustomerBalanceBadgeProps) {
  const display = formatCustomerBalanceDisplay(balance);

  return (
    <div
      className={cn(
        'flex max-w-[7.5rem] shrink-0 flex-col items-end text-right sm:max-w-[8.5rem]',
        className,
      )}
    >
      <span
        className={cn(
          'text-[11px] font-semibold uppercase tracking-wide',
          display.kind === 'debit' && 'text-red-600',
          display.kind === 'credit' && 'text-emerald-700',
          display.kind === 'zero' && 'text-brand-gray-400',
        )}
      >
        {display.label}
      </span>
      <span
        className={cn(
          'truncate text-sm font-semibold tabular-nums',
          display.kind === 'zero'
            ? 'text-brand-gray-400'
            : 'text-brand-navy',
        )}
      >
        {display.amountText}
      </span>
    </div>
  );
}
