import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchInput } from '@/shared/components/form/SearchInput';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { useCachedCustomers } from '@/features/orders/hooks/useCachedCustomers';
import {
  getRecentCustomers,
  type RecentCustomerPref,
} from '@/features/orders/hooks/orderPrefs';
import { visibleOrderPickerCustomers } from '@/features/orders/utils/customerPickerSearch';
import { buildOrderBranchPickerOptions } from '@/features/orders/utils/orderBranchOptions';
import { branchService } from '@/features/customers/services/branchService';
import type { Customer, CustomerBranch } from '@/shared/types/customer.types';
import { cn } from '@/shared/utils/cn';

interface MobileCustomerSectionProps {
  selectedCustomerId?: string;
  selectedCustomerName?: string;
  selectedBranchId?: string;
  selectedBranchName?: string;
  onSelectCustomer: (customer: Customer) => void;
  onSelectBranch: (branchId: string, branchName: string) => void;
  onChangeCustomer: () => void;
  /** Notifies parent when the cari picker is open (keeps it mounted under Android IME). */
  onPickerOpenChange?: (open: boolean) => void;
}

export function MobileCustomerSection({
  selectedCustomerId,
  selectedCustomerName,
  selectedBranchId,
  selectedBranchName,
  onSelectCustomer,
  onSelectBranch,
  onChangeCustomer,
  onPickerOpenChange,
}: MobileCustomerSectionProps) {
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(!selectedCustomerId);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const resultsRef = useRef<HTMLUListElement>(null);

  const { customers, allCustomers, isInitialLoading } =
    useCachedCustomers(search);

  const branchOptions = useMemo(
    () =>
      buildOrderBranchPickerOptions(
        branches.map((b) => ({ id: b.id, name: b.name })),
      ),
    [branches],
  );

  useEffect(() => {
    onPickerOpenChange?.(pickerOpen);
  }, [pickerOpen, onPickerOpenChange]);

  useEffect(() => {
    if (!search.trim()) return;
    if (resultsRef.current) {
      resultsRef.current.scrollTop = 0;
    }
  }, [search, customers]);

  const recent = useMemo(() => {
    const prefs = getRecentCustomers(5);
    const byId = new Map(allCustomers.map((c) => [c.id, c]));
    return prefs
      .map((pref) => ({ pref, customer: byId.get(pref.id) }))
      .filter(
        (row): row is { pref: RecentCustomerPref; customer: Customer } =>
          Boolean(row.customer),
      );
  }, [allCustomers]);

  useEffect(() => {
    if (!selectedCustomerId || !branchPickerOpen) return;
    let cancelled = false;
    setBranchesLoading(true);
    void branchService
      .listByCustomer(selectedCustomerId)
      .then((rows) => {
        if (!cancelled) {
          setBranches(rows.filter((b) => b.isActive && !b.isDeleted));
        }
      })
      .finally(() => {
        if (!cancelled) setBranchesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCustomerId, branchPickerOpen]);

  if (selectedCustomerId && !pickerOpen) {
    return (
      <div className="space-y-2 rounded-2xl border border-brand-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-brand-gray-500">Müşteri</p>
            <p className="truncate text-base font-semibold text-brand-navy">
              {selectedCustomerName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPickerOpen(true);
              setBranchPickerOpen(false);
              onChangeCustomer();
            }}
            className="min-h-12 shrink-0 rounded-xl px-3 text-sm font-semibold text-brand-navy active:bg-brand-gray-100"
          >
            Değiştir
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setBranchPickerOpen((open) => !open);
          }}
          className="flex min-h-12 w-full items-center justify-between rounded-xl bg-brand-gray-50 px-3 text-left active:bg-brand-gray-100"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-brand-gray-500">
              Şube
            </p>
            <p className="truncate text-sm font-semibold text-brand-navy">
              {selectedBranchName ?? 'Şube seçin'}
            </p>
          </div>
          <span className="text-xs font-semibold text-brand-navy">
            {branchPickerOpen ? 'Kapat' : 'Değiştir'}
          </span>
        </button>

        {branchPickerOpen ? (
          <div className="space-y-1 rounded-xl border border-brand-gray-100 p-1">
            {branchesLoading ? (
              <LoadingSpinner label="Şubeler..." />
            ) : (
              branchOptions.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => {
                    onSelectBranch(branch.id, branch.name);
                    setBranchPickerOpen(false);
                  }}
                  className={cn(
                    'flex min-h-12 w-full items-center rounded-xl px-3 text-left text-sm font-medium',
                    selectedBranchId === branch.id
                      ? 'bg-brand-navy text-white'
                      : 'text-brand-navy active:bg-brand-gray-50',
                  )}
                >
                  {branch.name}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-brand-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-brand-navy">
          {search.trim()
            ? `Müşteri seç · ${String(customers.length)}`
            : 'Müşteri seç'}
        </p>
        {selectedCustomerId ? (
          <button
            type="button"
            className="min-h-12 px-2 text-sm font-medium text-brand-gray-500"
            onClick={() => {
              setPickerOpen(false);
            }}
          >
            Kapat
          </button>
        ) : null}
      </div>

      {recent.length > 0 && !search.trim() ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-gray-500">
            Son kullanılan
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recent.map(({ customer }) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => {
                  onSelectCustomer(customer);
                  setPickerOpen(false);
                  setSearch('');
                }}
                className={cn(
                  'min-h-12 shrink-0 rounded-full border px-4 text-sm font-medium',
                  selectedCustomerId === customer.id
                    ? 'border-brand-navy bg-brand-navy text-white'
                    : 'border-brand-gray-200 bg-brand-gray-50 text-brand-navy',
                )}
              >
                {customer.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <SearchInput
        placeholder="Müşteri ara..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        onClear={() => {
          setSearch('');
        }}
        className="h-12 text-base"
      />

      {isInitialLoading ? (
        <LoadingSpinner label="Müşteriler yükleniyor..." />
      ) : customers.length === 0 ? (
        <EmptyState
          title="Müşteri bulunamadı"
          description="Arama terimini değiştirin."
        />
      ) : (
        <ul
          ref={resultsRef}
          className="overflow-anchor-none max-h-56 space-y-1 overflow-y-auto overscroll-y-contain"
          data-customer-search-results="true"
        >
          {visibleOrderPickerCustomers(customers, search).map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectCustomer(customer);
                  setPickerOpen(false);
                  setSearch('');
                }}
                className={cn(
                  'flex min-h-12 w-full items-center rounded-xl px-3 text-left',
                  selectedCustomerId === customer.id
                    ? 'bg-brand-navy/10'
                    : 'active:bg-brand-gray-50',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-brand-navy">
                    {customer.name}
                  </p>
                  <p className="truncate text-xs text-brand-gray-500">
                    {customer.code}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
