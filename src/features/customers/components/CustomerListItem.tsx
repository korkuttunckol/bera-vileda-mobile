import { useNavigate } from 'react-router-dom';
import { type MouseEvent } from 'react';
import { Card } from '@/shared/components/ui/Card';
import { Icon } from '@/shared/components/ui/Icon';
import { formatCustomerBalanceDisplay } from '../utils/customerBalanceDisplay';
import type { Customer } from '@/shared/types/customer.types';
import { ROUTES } from '@/shared/constants/routes';
import { cn, formatCurrency } from '@/shared/utils/cn';

interface CustomerListItemProps {
  customer: Customer;
  onSelect?: (customer: Customer) => void;
  selected?: boolean;
  /** Show Logo card balance (Müşteriler list only). */
  showBalance?: boolean;
}

export function CustomerListItem({
  customer,
  onSelect,
  selected = false,
  showBalance = false,
}: CustomerListItemProps) {
  const navigate = useNavigate();
  const isSelectMode = Boolean(onSelect);
  const balanceDisplay = formatCustomerBalanceDisplay(customer.balance);
  const balancePrefix = balanceDisplay.kind === 'credit' ? 'A' : 'B';
  const balanceAmount = balanceDisplay.kind === 'zero' && customer.balance !== undefined
    ? formatCurrency(0)
    : balanceDisplay.amountText;

  const handleEdit = (): void => {
    if (onSelect) {
      onSelect(customer);
      return;
    }
    void navigate(ROUTES.CUSTOMER_ACTIONS.replace(':id', customer.id));
  };

  const handleBranches = (e: MouseEvent): void => {
    e.stopPropagation();
    void navigate(ROUTES.CUSTOMER_BRANCHES.replace(':id', customer.id));
  };

  return (
    <Card
      padding="none"
      interactive
      className={cn(selected && 'list-row-selected')}
      onClick={handleEdit}
    >
      <div className="flex min-w-0 items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-brand-navy">{customer.name}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-brand-gray-500">
            <span className="font-medium tabular-nums text-brand-gray-600">
              {customer.code}
            </span>
            {customer.address?.city ? (
              <span className="text-brand-gray-500">{customer.address.city}</span>
            ) : null}
            {showBalance ? (
              <span
                className={cn(
                  'ml-auto whitespace-nowrap font-semibold tabular-nums',
                  balanceDisplay.kind === 'debit' && 'text-red-600',
                  balanceDisplay.kind === 'credit' && 'text-emerald-700',
                  balanceDisplay.kind === 'zero' && 'text-brand-gray-400',
                )}
              >
                {balancePrefix}: {balanceAmount}
              </span>
            ) : null}
          </div>
        </div>
        <Icon
          name="chevron-right"
          className="shrink-0 text-brand-gray-400"
          size="md"
        />
      </div>
      {!isSelectMode ? (
        <div className="border-t border-brand-gray-100">
          <button
            type="button"
            onClick={handleBranches}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-gray-50 hover:text-brand-navy-light active:opacity-70"
          >
            <span>Şubeleri Yönet</span>
            <Icon name="chevron-right" size="sm" />
          </button>
        </div>
      ) : null}
    </Card>
  );
}
