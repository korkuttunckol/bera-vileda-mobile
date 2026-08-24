import { useMemo, useState } from 'react';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { SearchInput } from '@/shared/components/form/SearchInput';
import { useProducts } from '@/features/products/hooks/useProducts';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DepotStockCard } from './DepotStockCard';
import { ReportingMenuButton } from './ReportingMenuButton';

export function ReportingStockPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const stockGroupCode = user?.reportingStockAuthorityCode?.trim().toLocaleUpperCase('tr-TR') ?? '';
  const { products, isLoading } = useProducts(search, 'active', stockGroupCode || undefined);
  const visibleProducts = useMemo(() => products.filter((product) =>
    product.groupCode?.trim().toLocaleUpperCase('tr-TR') === stockGroupCode,
  ), [products, stockGroupCode]);

  return (
    <div>
      <PageHeader title="Depo Merkez Stok" subtitle={`Stok grup kodu: ${stockGroupCode || '-'}`} action={<ReportingMenuButton />} />
      <div className="page-content !space-y-0 !p-0">
        <div className="sticky top-[76px] z-20 space-y-4 border-b border-brand-gray-200/80 bg-brand-surface/95 px-4 py-4 backdrop-blur-md">
          <SearchInput placeholder="Barkod, ürün kodu veya ad..." value={search} onChange={(event) => { setSearch(event.target.value); }} onClear={() => { setSearch(''); }} />
        </div>
        <div className="px-4 pb-6 pt-4">
          {isLoading ? <LoadingSpinner fullPage label="Stoklar yükleniyor..." /> : !stockGroupCode ? <EmptyState title="Stok grup kodu tanımlı değil" description="ADMIN, Kullanıcı Ayarları içinden bu raporlama kullanıcısına Logo STGRPCODE kodunu tanımlamalı." /> : visibleProducts.length === 0 ? <EmptyState title="Yetkili stok kartı bulunamadı" description={`${stockGroupCode} için Logo stok grubu eşleşen ürün yok.`} /> : <div className="list-stack"><p className="section-label">{visibleProducts.length} ürün · Merkez depo stokları</p>{visibleProducts.map((product) => <DepotStockCard key={product.id} product={product} />)}</div>}
        </div>
      </div>
    </div>
  );
}
