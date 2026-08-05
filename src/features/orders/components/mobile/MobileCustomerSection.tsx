import { useMemo, useState } from 'react';
import { SearchInput } from '@/shared/components/form/SearchInput';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { useCachedCustomers } from '@/features/orders/hooks/useCachedCustomers';
import {
  getRecentCustomers,
  type RecentCustomerPref,
} from '@/features/orders/hooks/orderPrefs';
import type { Customer } from '@/shared/types/customer.types';
import { cn } from '@/shared/utils/cn';

interface MobileCustomerSectionProps {
  selectedCustomerId?: string;
  selectedCustomerName?: string;
  selectedBranchName?: string;
  onSelectCustomer: (customer: Customer) => void;
  onChangeCustomer: () => void;
}

export function MobileCustomerSection({
  selectedCustomerId,
  selectedCustomerName,
  selectedBranchName,
  onSelectCustomer,
  onChangeCustomer,
}: MobileCustomerSectionProps) {
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(!selectedCustomerId);
  const { customers, allCustomers, isInitialLoading } =
    useCachedCustomers(search);

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

  if (selectedCustomerId && !pickerOpen) {
    return (
      <div className="rounded-2xl border border-brand-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-brand-gray-500">Müşteri</p>
            <p className="truncate text-base font-semibold text-brand-navy">
              {selectedCustomerName}
            </p>
            <p className="mt-1 text-xs text-brand-gray-500">
              Şube: {selectedBranchName ?? 'Merkez'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPickerOpen(true);
              onChangeCustomer();
            }}
            className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-brand-navy active:bg-brand-gray-100"
          >
            Değiştir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-brand-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-brand-navy">Müşteri seç</p>
        {selectedCustomerId ? (
          <button
            type="button"
            className="min-h-11 px-2 text-sm font-medium text-brand-gray-500"
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
                  'min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium',
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
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {customers.slice(0, 40).map((customer) => (
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
