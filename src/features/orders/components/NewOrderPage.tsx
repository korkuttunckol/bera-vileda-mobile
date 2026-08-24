import { PageHeader } from '@/shared/components/layout/PageHeader';
import { MobileOrderScreen } from './mobile/MobileOrderScreen';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { branchService } from '@/features/customers/services/branchService';
import { rememberLastBranch } from '@/features/orders/hooks/orderPrefs';
import { buildOrderBranchPickerOptions } from '@/features/orders/utils/orderBranchOptions';
import { cn } from '@/shared/utils/cn';
import type { CustomerBranch } from '@/shared/types/customer.types';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOrderDraftPersist } from '@/features/orders/hooks/useOrderDraftPersist';

function OrderBranchHeaderPicker() {
  const customerId = useOrderDraftStore((s) => s.customerId);
  const branchId = useOrderDraftStore((s) => s.branchId);
  const branchName = useOrderDraftStore((s) => s.branchName);
  const selectBranch = useOrderDraftStore((s) => s.selectBranch);
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<CustomerBranch[]>([]);

  useEffect(() => {
    if (!customerId) {
      setBranches([]);
      return;
    }
    let cancelled = false;
    void branchService.listByCustomer(customerId).then((rows) => {
      if (!cancelled) {
        setBranches(rows.filter((branch) => branch.isActive && !branch.isDeleted));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const options = useMemo(
    () => buildOrderBranchPickerOptions(branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
    }))),
    [branches],
  );

  if (!customerId) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-9 max-w-28 items-center gap-1 rounded-lg bg-brand-gray-100 px-2 text-left text-xs font-semibold text-brand-navy active:bg-brand-gray-200"
      >
        <span className="truncate">{branchName ?? 'Şube seçin'}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-50 min-w-36 overflow-hidden rounded-xl border border-brand-gray-200 bg-white p-1 shadow-lg">
          {options.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => {
                selectBranch(branch.id, branch.name);
                rememberLastBranch(customerId, {
                  branchId: branch.id,
                  branchName: branch.name,
                });
                setOpen(false);
              }}
              className={cn(
                'flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium',
                branch.id === branchId
                  ? 'bg-brand-navy text-white'
                  : 'text-brand-navy active:bg-brand-gray-50',
              )}
            >
              {branch.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * New order entry — single mobile screen.
 * Existing 5-step wizard state machine remains in orderDraftStore; UI no longer shows steps.
 *
 * Layout: fill MainLayout main (overflow hidden) so MobileOrderScreen can pin
 * the product search outside the product-list scrollport.
 */
export function NewOrderPage() {
  const [searchParams] = useSearchParams();
  const presetCustomerId = searchParams.get('customerId')?.trim() || undefined;
  useOrderDraftPersist({ skipHydration: Boolean(presetCustomerId) });

  const customerName = useOrderDraftStore((s) => s.customerName);
  const subtitle = customerName || 'Hızlı sipariş';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Yeni Sipariş"
        subtitle={subtitle}
        subtitleAction={<OrderBranchHeaderPicker />}
        sticky={false}
        className="shrink-0"
      />
      <MobileOrderScreen presetCustomerId={presetCustomerId} />
    </div>
  );
}
