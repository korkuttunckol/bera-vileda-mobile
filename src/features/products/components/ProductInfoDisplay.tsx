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
  /** Sipariş akışında yalnızca kod, ad, barkod ve stok gösterilir. */
  variant?: 'default' | 'order' | 'depot';
}

export function ProductInfoDisplay({
  product,
  className,
  variant = 'default',
}: ProductInfoDisplayProps) {
  const productFields = useProductDisplayFields();
  const isOrderView = variant === 'order';
  const isDepotView = variant === 'depot';
  const isVisible = (field: ProductDisplayField): boolean => {
    if (isOrderView) {
      return field === 'sku' || field === 'name' || field === 'stock';
    }
    return isProductFieldVisible(productFields, field);
  };
  const isOutOfStock = product.stockQuantity <= 0;
  const groupCode = product.groupCode?.trim() || '—';
  const barcode = product.barcode?.trim();

  const stockLine = (
    <div className="flex flex-wrap items-center gap-2">
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
  );

  const depotStockSummary = (
    <div className="mt-2 grid grid-cols-2 items-start gap-x-3 border-t border-brand-gray-100 pt-2">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm text-brand-gray-500">Grup Kodu: {groupCode}</p>
        {barcode ? (
          <p className="truncate text-xs text-brand-gray-400">Barkod: {barcode}</p>
        ) : null}
      </div>
      <div className="min-w-0 text-right">
        <p className="text-lg font-semibold text-brand-gray-600">Depo Stok</p>
        <p
          className={cn(
            'mt-0.5 text-xl font-bold tabular-nums',
            isOutOfStock ? 'text-red-600' : 'text-brand-navy',
          )}
        >
          {product.stockQuantity} {product.unit}
        </p>
      </div>
    </div>
  );

  return (
    <div className={cn('min-w-0', className)}>
      {isVisible('name') ? (
        <p className="break-words text-sm font-semibold text-brand-navy">{product.name}</p>
      ) : null}
      {isVisible('sku') ? (
        <p className="mt-0.5 truncate text-sm text-brand-gray-500">
          {product.sku?.trim()
            ? product.sku
            : product.barcode?.trim()
              ? `Barkod: ${product.barcode.trim()}`
              : '—'}
        </p>
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

      {isOrderView ? (
        <div className="mt-2">{stockLine}</div>
      ) : isDepotView ? (
        depotStockSummary
      ) : (
        <div className="mt-2 grid grid-cols-2 items-start gap-x-3 border-t border-brand-gray-100 pt-2">
          <div className="min-w-0 space-y-1">
            {stockLine}
            {barcode ? (
              <p className="truncate text-xs text-brand-gray-400">
                Barkod: {barcode}
              </p>
            ) : null}
          </div>
          <div className="min-w-0 space-y-1 text-right">
            <p className="truncate text-xs text-brand-gray-500">
              Grup Kodu: {groupCode}
            </p>
            <>
              <p className="text-sm font-medium text-brand-navy">
                Liste: {formatCurrency(product.listPrice)}
              </p>
              <p className="text-xs text-brand-gray-500">KDV: %{product.vatRate}</p>
            </>
          </div>
        </div>
      )}
    </div>
  );
}
