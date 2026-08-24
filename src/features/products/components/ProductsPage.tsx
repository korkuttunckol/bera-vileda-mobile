import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { SearchInput } from '@/shared/components/form/SearchInput';
import {
  ActiveFilter,
  type ActiveFilterValue,
} from '@/shared/components/form/ActiveFilter';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ProductCard } from './ProductCard';
import { GroupCodeFilter } from './GroupCodeFilter';
import { useProducts } from '../hooks/useProducts';
import { ROUTES } from '@/shared/constants/routes';

export function ProductsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('active');
  const [groupCode, setGroupCode] = useState('');
  const { products, groupCodes, isLoading } = useProducts(
    search,
    activeFilter,
    groupCode || undefined,
  );
  const hasQuery = Boolean(search.trim() || groupCode);

  useEffect(() => {
    if (groupCode && groupCodes.length > 0 && !groupCodes.includes(groupCode)) {
      setGroupCode('');
    }
  }, [groupCode, groupCodes]);

  return (
    <div>
      <PageHeader
        title="Ürünler"
        subtitle="Barkod, ürün kodu veya ad ile arayın"
      />

      <div className="page-content !space-y-0 !p-0">
        <div className="sticky top-[76px] z-20 space-y-4 border-b border-brand-gray-200/80 bg-brand-surface/95 px-4 py-4 backdrop-blur-md">
          <SearchInput
            placeholder="Barkod, ürün kodu veya ad..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            onClear={() => { setSearch(''); }}
          />
          <ActiveFilter value={activeFilter} onChange={setActiveFilter} />
          <GroupCodeFilter
            value={groupCode}
            options={groupCodes}
            onChange={setGroupCode}
          />
        </div>

        <div className="px-4 pb-6 pt-4">
        {isLoading ? (
          <LoadingSpinner fullPage label="Ürünler yükleniyor..." />
        ) : products.length === 0 ? (
          <EmptyState
            title={hasQuery ? 'Sonuç bulunamadı' : 'Henüz ürün yok'}
            description={
              hasQuery
                ? 'Farklı bir arama terimi veya grup kodu deneyin.'
                : "Ayarlar → Logo'dan Stok / Ürün Verilerini Al veya Excel içe aktarma."
            }
          />
        ) : (
          <div className="list-stack">
            <p className="section-label">
              {products.length} ürün · Alfabetik sıralı
            </p>
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                mode="catalog"
                onSelect={() =>
                  void navigate(ROUTES.PRODUCT_EDIT.replace(':id', p.id))
                }
              />
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
