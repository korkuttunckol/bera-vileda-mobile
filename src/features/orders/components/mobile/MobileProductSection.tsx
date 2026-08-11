import { useMemo, useState, type KeyboardEvent } from 'react';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { useCachedProducts } from '@/features/orders/hooks/useCachedProducts';
import { cn } from '@/shared/utils/cn';
import { MobileProductRow } from './MobileProductRow';
import type { Product } from '@/shared/types/product.types';

interface MobileProductSectionProps {
  enabled: boolean;
  cartQtyByProductId: Record<string, number>;
  onQuantityChange: (product: Product, quantity: number) => void;
}

export function MobileProductSection({
  enabled,
  cartQtyByProductId,
  onQuantityChange,
}: MobileProductSectionProps) {
  const [search, setSearch] = useState('');
  const { products, allProducts, isInitialLoading } = useCachedProducts(search);

  /** Products currently on the order draft with qty > 0 (cart insertion order). */
  const takenProducts = useMemo(() => {
    const byId = new Map(allProducts.map((p) => [p.id, p]));
    return Object.entries(cartQtyByProductId)
      .filter(([, qty]) => qty > 0)
      .map(([id]) => byId.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [allProducts, cartQtyByProductId]);

  const handleBarcodeKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    // Keep Enter hook for future scanner / camera flow; search filter already live.
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-gray-200 bg-brand-gray-50 p-6 text-center text-sm text-brand-gray-500">
        Ürün eklemek için önce müşteri seçin.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-brand-navy"
          aria-hidden
        >
          {/* Prominent barcode mark — camera integration can wrap this later */}
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 5v14M7 5v14M10 5v14M13 5v14M16 5v14M20 5v14" />
          </svg>
        </span>
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Barkod, ürün kodu veya ad..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          onKeyDown={handleBarcodeKeyDown}
          data-barcode-search="true"
          className={cn(
            'h-14 w-full rounded-xl border border-brand-gray-200/90 bg-white pl-12 pr-11 text-base shadow-sm',
            'placeholder:text-brand-gray-400',
            'focus:border-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-navy/15',
          )}
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              setSearch('');
            }}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-brand-gray-400 active:bg-brand-gray-100"
            aria-label="Temizle"
          >
            ×
          </button>
        ) : (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-brand-navy active:bg-brand-gray-100"
            aria-label="Barkod tarama (yakında)"
            title="Kamera ile barkod — yakında"
            onClick={() => {
              // Placeholder for future camera barcode integration.
            }}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 7V5a1 1 0 011-1h2M20 7V5a1 1 0 00-1-1h-2M4 17v2a1 1 0 001 1h2M20 17v2a1 1 0 01-1 1h-2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
      </div>

      {isInitialLoading ? (
        <LoadingSpinner label="Ürünler yükleniyor..." />
      ) : (
        <>
          {takenProducts.length > 0 ? (
            <section className="rounded-2xl border border-brand-gray-200 bg-white px-2.5 py-1 shadow-sm">
              <p className="px-0.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-gray-500">
                {`Alınan Siparişler (${String(takenProducts.length)})`}
              </p>
              <div className="max-h-48 overflow-y-auto overscroll-y-contain">
                {takenProducts.map((product) => (
                  <MobileProductRow
                    key={`taken-${product.id}`}
                    product={product}
                    quantity={cartQtyByProductId[product.id] ?? 0}
                    onQuantityChange={(qty) => {
                      onQuantityChange(product, qty);
                    }}
                    compact
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-brand-gray-200 bg-white px-2.5 py-1 shadow-sm">
            <p className="px-0.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-gray-500">
              {`Ürün Listesi (${String(products.length)})`}
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
                  quantity={cartQtyByProductId[product.id] ?? 0}
                  onQuantityChange={(qty) => {
                    onQuantityChange(product, qty);
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
