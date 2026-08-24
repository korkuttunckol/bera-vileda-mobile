import { useMemo, useState } from 'react';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { SearchInput } from '@/shared/components/form/SearchInput';
import { GroupCodeFilter } from '@/features/products/components/GroupCodeFilter';
import { useProducts } from '@/features/products/hooks/useProducts';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DepotStockCard } from './DepotStockCard';
import { ReportingMenuButton } from './ReportingMenuButton';

export function ReportingStockPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const { products, groupCodes, isLoading } = useProducts(search, 'active', groupCode || undefined);
  const authorityCode = user?.reportingStockAuthorityCode?.trim().toLocaleUpperCase('tr-TR') ?? '';
  const visibleProducts = useMemo(() => products.filter((product) =>
    product.specialCode?.trim().toLocaleUpperCase('tr-TR') === authorityCode,
  ), [authorityCode, products]);
  const visibleGroups = useMemo(() => Array.from(new Set(visibleProducts.map((product) => product.groupCode?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, 'tr-TR')), [visibleProducts]);
  const filteredGroupCodes = groupCode ? groupCodes : visibleGroups;

  return (
    <div>
      <PageHeader title="Depo Merkez Stok" subtitle={`Stok yetki kodu: ${authorityCode || '-'}`} action={<ReportingMenuButton />} />
      <div className="page-content !space-y-0 !p-0">
        <div className="sticky top-[76px] z-20 space-y-4 border-b border-brand-gray-200/80 bg-brand-surface/95 px-4 py-4 backdrop-blur-md">
          <SearchInput placeholder="Barkod, ürün kodu veya ad..." value={search} onChange={(event) => { setSearch(event.target.value); }} onClear={() => { setSearch(''); }} />
          <GroupCodeFilter value={groupCode} options={filteredGroupCodes} onChange={setGroupCode} />
        </div>
        <div className="px-4 pb-6 pt-4">
          {isLoading ? <LoadingSpinner fullPage label="Stoklar yükleniyor..." /> : !authorityCode ? <EmptyState title="Stok yetki kodu tanımlı değil" description="ADMIN, Kullanıcı Ayarları içinden bu raporlama kullanıcısına Logo SPECODE kodunu tanımlamalı." /> : visibleProducts.length === 0 ? <EmptyState title="Yetkili stok kartı bulunamadı" description={`${authorityCode} için Logo stok yetki kodu eşleşen ürün yok.`} /> : <div className="list-stack"><p className="section-label">{visibleProducts.length} ürün · Merkez depo stokları</p>{visibleProducts.map((product) => <DepotStockCard key={product.id} product={product} />)}</div>}
        </div>
      </div>
    </div>
  );
}
