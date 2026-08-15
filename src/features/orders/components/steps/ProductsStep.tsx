import { useState, useCallback, useMemo, type KeyboardEvent } from 'react';
import { SearchInput } from '@/shared/components/form/SearchInput';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ProductCard } from '@/features/products/components/ProductCard';
import { useProducts } from '@/features/products/hooks/useProducts';
import { productService } from '@/features/products/services/productService';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { FloatingCartBar } from '@/features/orders/components/FloatingCartBar';
import { toast } from '@/stores/toastStore';
import { isProductOutOfStock } from '@/features/orders/utils/stockControl';
import type { Product } from '@/shared/types/product.types';

export function ProductsStep() {
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { products, isLoading } = useProducts(search);
  const branchName = useOrderDraftStore((s) => s.branchName);
  const lines = useOrderDraftStore((s) => s.lines);
  const addToCart = useOrderDraftStore((s) => s.addToCart);
  const setStep = useOrderDraftStore((s) => s.setStep);

  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    lines.forEach((l) => {
      map[l.productId] = l.quantity;
    });
    return map;
  }, [lines]);

  const getQty = (productId: string): number => quantities[productId] ?? 1;

  const setQty = (productId: string, qty: number): void => {
    setQuantities((prev) => ({ ...prev, [productId]: qty }));
  };

  const handleAdd = (product: Product): void => {
    if (isProductOutOfStock(product)) {
      toast('Bu ürünün stoğu bulunmuyor.', 'warning');
      return;
    }
    const ok = addToCart(product, getQty(product.id));
    if (ok) {
      toast(`${product.name} sepete eklendi`, 'success');
    }
  };

  const handleBarcodeSearch = useCallback(
    async (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      const code = search.trim();
      if (!code) return;

      const byBarcode = await productService.findByBarcode(code);
      if (byBarcode) {
        if (isProductOutOfStock(byBarcode)) {
          toast('Bu ürünün stoğu bulunmuyor.', 'warning');
          return;
        }
        if (addToCart(byBarcode, quantities[byBarcode.id] ?? 1)) {
          toast(`${byBarcode.name} sepete eklendi`, 'success');
          setSearch('');
        }
        return;
      }

      const exact = products.find(
        (p) => p.sku.toLowerCase() === code.toLowerCase(),
      );
      if (exact) {
        if (isProductOutOfStock(exact)) {
          toast('Bu ürünün stoğu bulunmuyor.', 'warning');
          return;
        }
        if (addToCart(exact, quantities[exact.id] ?? 1)) {
          toast(`${exact.name} sepete eklendi`, 'success');
          setSearch('');
        }
      }
    },
    [search, products, addToCart, quantities],
  );

  return (
    <div className="pb-36">
      <div className="space-y-3 p-4">
        <Card padding="sm">
          <p className="text-xs text-brand-gray-500">Seçili Şube</p>
          <p className="font-medium text-brand-navy">{branchName}</p>
        </Card>

        <SearchInput
          placeholder="Barkod, ürün kodu veya ad..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          onClear={() => { setSearch(''); }}
          onKeyDown={(e) => void handleBarcodeSearch(e)}
          autoComplete="off"
        />

        {isLoading ? (
          <LoadingSpinner label="Ürünler yükleniyor..." />
        ) : products.length === 0 ? (
          <EmptyState
            title={search ? 'Ürün bulunamadı' : 'Ürün kataloğu boş'}
            description="Ayarlar → Logo'dan Stok / Ürün Verilerini Al veya Excel içe aktarma ile yükleyin."
          />
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                mode="order"
                quantity={getQty(p.id)}
                onQuantityChange={(q) => { setQty(p.id, q); }}
                onAdd={() => { handleAdd(p); }}
                inCartQty={cartQtyMap[p.id] ?? 0}
              />
            ))}
          </div>
        )}

        <Button variant="outline" fullWidth onClick={() => { setStep('branch'); }}>
          ← Şube Değiştir
        </Button>
      </div>

      <FloatingCartBar onOpenCart={() => { setStep('cart'); }} />
    </div>
  );
}
