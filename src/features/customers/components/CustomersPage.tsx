import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { SearchInput } from '@/shared/components/form/SearchInput';
import {
  ActiveFilter,
  type ActiveFilterValue,
} from '@/shared/components/form/ActiveFilter';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { CustomerListItem } from './CustomerListItem';
import { useCustomers } from '../hooks/useCustomers';
import { ROUTES } from '@/shared/constants/routes';

export function CustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const { customers, isLoading } = useCustomers(search, activeFilter);

  return (
    <div>
      <PageHeader
        title="Müşteriler"
        subtitle="Cari kartları"
        action={
          <Button
            size="sm"
            onClick={() => void navigate(ROUTES.CUSTOMER_NEW)}
          >
            + Yeni
          </Button>
        }
      />

      <div className="page-content">
        <SearchInput
          placeholder="Cari kodu veya müşteri adı ara..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          onClear={() => { setSearch(''); }}
        />
        <ActiveFilter value={activeFilter} onChange={setActiveFilter} />

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
            action={
              !search ? (
                <Button onClick={() => void navigate(ROUTES.CUSTOMER_NEW)}>
                  + Yeni Müşteri
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="list-stack">
            <p className="section-label">
              {customers.length} müşteri · Alfabetik sıralı
            </p>
            {customers.map((c) => (
              <CustomerListItem key={c.id} customer={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
