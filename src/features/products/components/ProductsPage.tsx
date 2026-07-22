import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { SearchInput } from '@/shared/components/form/SearchInput';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ProductCard } from './ProductCard';
import { useProducts } from '../hooks/useProducts';
import { ROUTES } from '@/shared/constants/routes';

export function ProductsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { products, isLoading } = useProducts(search);

  return (
    <div>
      <PageHeader
        title="Ürünler"
        subtitle="Barkod, ürün kodu veya ad ile arayın"
        action={
          <Button size="sm" onClick={() => void navigate(ROUTES.PRODUCT_NEW)}>
            + Yeni
          </Button>
        }
      />

      <div className="page-content">
        <SearchInput
          placeholder="Barkod, ürün kodu veya ad..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          onClear={() => { setSearch(''); }}
        />

        {isLoading ? (
          <LoadingSpinner fullPage label="Ürünler yükleniyor..." />
        ) : products.length === 0 ? (
          <EmptyState
            title={search ? 'Sonuç bulunamadı' : 'Henüz ürün yok'}
            description={
              search
                ? 'Farklı bir arama terimi deneyin.'
                : 'Yeni ürün ekleyin veya Ayarlar > İçe Aktar kullanın.'
            }
            action={
              !search ? (
                <Button onClick={() => void navigate(ROUTES.PRODUCT_NEW)}>
                  + Yeni Ürün
                </Button>
              ) : undefined
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
  );
}
