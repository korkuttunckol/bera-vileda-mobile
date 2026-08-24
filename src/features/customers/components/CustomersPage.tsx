import { useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { SearchInput } from '@/shared/components/form/SearchInput';
import {
  ActiveFilter,
  type ActiveFilterValue,
} from '@/shared/components/form/ActiveFilter';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { CustomerListItem } from './CustomerListItem';
import { useCustomers } from '../hooks/useCustomers';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('active');
  const { customers, isLoading } = useCustomers(search, activeFilter);

  return (
    <div>
      <PageHeader
        title="Müşteriler"
        subtitle="Cari kartları"
      />

      <div className="page-content !space-y-0 !p-0">
        <div className="sticky top-[76px] z-20 space-y-4 border-b border-brand-gray-200/80 bg-brand-surface/95 px-4 py-4 backdrop-blur-md">
          <SearchInput
            placeholder="Cari kodu veya müşteri adı ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            onClear={() => { setSearch(''); }}
          />
          <ActiveFilter value={activeFilter} onChange={setActiveFilter} />
        </div>

        <div className="px-4 pb-6 pt-4">
        {isLoading ? (
          <LoadingSpinner fullPage label="Müşteriler yükleniyor..." />
        ) : customers.length === 0 ? (
          <EmptyState
            title={search ? 'Sonuç bulunamadı' : 'Henüz müşteri yok'}
            description={
              search
                ? 'Farklı bir arama terimi deneyin.'
                : "Yeni müşteri ekleyin veya Ayarlar → Logo'dan Cari Verilerini Al."
            }
          />
        ) : (
          <div className="list-stack">
            <p className="section-label">
              {customers.length} müşteri · Cari koduna göre sıralı
            </p>
            {customers.map((c) => (
              <CustomerListItem key={c.id} customer={c} showBalance />
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
