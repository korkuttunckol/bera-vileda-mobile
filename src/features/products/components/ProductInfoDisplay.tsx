import { Badge } from '@/shared/components/ui/Badge';
import { formatCurrency } from '@/shared/utils/cn';
import { cn } from '@/shared/utils/cn';
import { useProductDisplayFields } from '@/stores/displayPreferencesStore';
import { isProductFieldVisible } from '@/shared/lib/indexeddb/displayPreferencesStorage';
import type { ProductDisplayField } from '@/shared/types/displayPreferences.types';
import type { Product } from '@/shared/types/product.types';

interface ProductInfoDisplayProps {
  product: Product;
  className?: string;
  /** Sipariş akışında yalnızca kod, ad, barkod ve stok gösterilir */
  variant?: 'default' | 'order';
}

export function ProductInfoDisplay({
  product,
  className,
  variant = 'default',
}: ProductInfoDisplayProps) {
  const productFields = useProductDisplayFields();
  const isOrderView = variant === 'order';
  const isVisible = (field: ProductDisplayField): boolean => {
    if (isOrderView) {
      return field === 'sku' || field === 'name' || field === 'stock';
    }
    return isProductFieldVisible(productFields, field);
  };
  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <div className={cn('min-w-0', className)}>
      {isVisible('name') ? (
        <p className="break-words font-semibold text-brand-navy">{product.name}</p>
      ) : null}
      {isVisible('sku') ? (
        <p className="mt-0.5 truncate text-sm text-brand-gray-500">{product.sku}</p>
      ) : null}
      {isOrderView && product.barcode ? (
        <p className="mt-1 truncate text-xs text-brand-gray-400">
          Barkod: {product.barcode}
        </p>
      ) : null}
      {!isOrderView && isVisible('category') && product.category ? (
        <p className="mt-0.5 truncate text-xs text-brand-gray-400">
          Kategori: {product.category}
        </p>
      ) : null}
      {isVisible('stock') ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              isOutOfStock ? 'text-red-600' : 'text-brand-gray-600',
            )}
          >
            Depo Stok: {product.stockQuantity}
            {!isOrderView && isVisible('unit') ? ` ${product.unit}` : ''}
          </span>
          {isOutOfStock ? (
            <Badge label="Stok Yok" variant="passive" className="!bg-red-100 !text-red-700" />
          ) : null}
        </div>
      ) : null}
      {!isOrderView && isVisible('barcode') && product.barcode ? (
        <p className="mt-1 truncate text-xs text-brand-gray-400">
          Barkod: {product.barcode}
        </p>
      ) : null}
      {!isOrderView && isVisible('price') ? (
        <p className="mt-1 text-sm font-medium text-brand-navy">
          {formatCurrency(product.listPrice)}
          {isVisible('unit') ? ` / ${product.unit}` : ''}
        </p>
      ) : null}
      {!isOrderView && isVisible('vatRate') ? (
        <p className="mt-1 text-xs text-brand-gray-500">
          KDV: %{product.vatRate}
        </p>
      ) : null}
    </div>
  );
}
