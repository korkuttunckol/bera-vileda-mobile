import { useState } from 'react';
import { SearchInput } from '@/shared/components/form/SearchInput';
import { ActiveFilter, type ActiveFilterValue } from '@/shared/components/form/ActiveFilter';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { CustomerListItem } from '@/features/customers/components/CustomerListItem';
import { useCustomers } from '@/features/customers/hooks/useCustomers';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import type { Customer } from '@/shared/types/customer.types';

export function CustomerSelectStep() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('active');
  const { customers, isLoading } = useCustomers(search, activeFilter);
  const selectCustomer = useOrderDraftStore((s) => s.selectCustomer);
  const selectedCustomerId = useOrderDraftStore((s) => s.customerId);

  const handleSelect = (customer: Customer): void => {
    selectCustomer(customer.id, customer.name, customer.code);
  };

  return (
    <div className="space-y-3 p-4">
      <SearchInput
        placeholder="Müşteri ara (kod veya ad)..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); }}
        onClear={() => { setSearch(''); }}
      />
      <ActiveFilter value={activeFilter} onChange={setActiveFilter} />

      {isLoading ? (
        <LoadingSpinner label="Müşteriler yükleniyor..." />
      ) : customers.length === 0 ? (
        <EmptyState
          title="Müşteri bulunamadı"
          description="Önce müşteri ekleyin veya arama terimini değiştirin."
        />
      ) : (
        <div className="space-y-2.5">
          {customers.map((c) => (
            <CustomerListItem
              key={c.id}
              customer={c}
              onSelect={handleSelect}
              selected={selectedCustomerId === c.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
