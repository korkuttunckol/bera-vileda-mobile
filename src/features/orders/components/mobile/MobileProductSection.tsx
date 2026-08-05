import { useMemo, useState } from 'react';
import { SearchInput } from '@/shared/components/form/SearchInput';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { useCachedProducts } from '@/features/orders/hooks/useCachedProducts';
import { getRecentProductIds } from '@/features/orders/hooks/orderPrefs';
import { MobileProductRow } from './MobileProductRow';
import type { Product } from '@/shared/types/product.types';

interface MobileProductSectionProps {
  enabled: boolean;
  cartQtyByProductId: Record<string, number>;
  onAddProduct: (product: Product) => void;
}

export function MobileProductSection({
  enabled,
  cartQtyByProductId,
  onAddProduct,
}: MobileProductSectionProps) {
  const [search, setSearch] = useState('');
  const { products, allProducts, isInitialLoading } = useCachedProducts(search);

  const favorites = useMemo(() => {
    if (search.trim()) return [];
    const byId = new Map(allProducts.map((p) => [p.id, p]));
    return getRecentProductIds(8)
      .map((id) => byId.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [allProducts, search]);

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-gray-200 bg-brand-gray-50 p-6 text-center text-sm text-brand-gray-500">
        Ürün eklemek için önce müşteri seçin.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SearchInput
        placeholder="Barkod, ürün kodu veya ad..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        onClear={() => {
          setSearch('');
        }}
        className="h-14 text-base"
        autoComplete="off"
        inputMode="search"
      />

      {isInitialLoading ? (
        <LoadingSpinner label="Ürünler yükleniyor..." />
      ) : (
        <>
          {favorites.length > 0 ? (
            <section className="rounded-2xl border border-brand-gray-200 bg-white px-3 py-2 shadow-sm">
              <p className="py-2 text-xs font-medium uppercase tracking-wide text-brand-gray-500">
                Favori / son ürünler
              </p>
              {favorites.map((product) => (
                <MobileProductRow
                  key={`fav-${product.id}`}
                  product={product}
                  inCartQty={cartQtyByProductId[product.id] ?? 0}
                  onAddOne={() => {
                    onAddProduct(product);
                  }}
                />
              ))}
            </section>
          ) : null}

          <section className="rounded-2xl border border-brand-gray-200 bg-white px-3 py-2 shadow-sm">
            <p className="py-2 text-xs font-medium uppercase tracking-wide text-brand-gray-500">
              Ürün listesi
              {search.trim() ? ` · ${String(products.length)}` : ''}
            </p>
            {products.length === 0 ? (
              <EmptyState
                title="Ürün bulunamadı"
                description="Barkod veya ürün adını kontrol edin."
              />
            ) : (
              products.slice(0, 80).map((product) => (
                <MobileProductRow
                  key={product.id}
                  product={product}
                  inCartQty={cartQtyByProductId[product.id] ?? 0}
                  onAddOne={() => {
                    onAddProduct(product);
                  }}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
