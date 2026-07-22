import { type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/shared/components/ui/Card';
import { Icon } from '@/shared/components/ui/Icon';
import { CustomerInfoDisplay } from './CustomerInfoDisplay';
import type { Customer } from '@/shared/types/customer.types';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/utils/cn';

interface CustomerListItemProps {
  customer: Customer;
  onSelect?: (customer: Customer) => void;
  selected?: boolean;
}

export function CustomerListItem({
  customer,
  onSelect,
  selected = false,
}: CustomerListItemProps) {
  const navigate = useNavigate();
  const isSelectMode = Boolean(onSelect);

  const handleEdit = (): void => {
    if (onSelect) {
      onSelect(customer);
    } else {
      void navigate(ROUTES.CUSTOMER_EDIT.replace(':id', customer.id));
    }
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
      <div className="flex min-w-0 items-center gap-3 px-4 py-4">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            selected
              ? 'bg-brand-navy text-white'
              : 'bg-brand-navy/10 text-brand-navy',
          )}
        >
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <CustomerInfoDisplay customer={customer} />
        <Icon
          name="chevron-right"
          className="shrink-0 text-brand-gray-400"
          size="md"
        />
      </div>
      {!isSelectMode ? (
        <div className="border-t border-brand-gray-100 px-4 py-2.5">
          <button
            type="button"
            onClick={handleBranches}
            className="text-xs font-semibold text-brand-navy transition-colors hover:text-brand-navy-light active:opacity-70"
          >
            Şubeleri Yönet →
          </button>
        </div>
      ) : null}
    </Card>
  );
}
