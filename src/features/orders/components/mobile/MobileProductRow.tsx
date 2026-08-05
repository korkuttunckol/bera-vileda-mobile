import { formatCurrency } from '@/shared/utils/cn';
import { cn } from '@/shared/utils/cn';
import type { Product } from '@/shared/types/product.types';

interface MobileProductRowProps {
  product: Product;
  inCartQty: number;
  onAddOne: () => void;
}

export function MobileProductRow({
  product,
  inCartQty,
  onAddOne,
}: MobileProductRowProps) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 border-b border-brand-gray-100 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-brand-navy">
          {product.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-brand-gray-500">
          {product.sku}
          {product.barcode ? ` · ${product.barcode}` : ''}
        </p>
        <p className="mt-1 text-sm font-medium text-brand-navy">
          {formatCurrency(product.listPrice)}
          {inCartQty > 0 ? (
            <span className="ml-2 text-xs font-semibold text-emerald-700">
              Sepette {inCartQty}
            </span>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        onClick={onAddOne}
        className={cn(
          'flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl',
          'bg-brand-navy text-lg font-bold text-white',
          'active:scale-95 active:bg-brand-navy-dark',
        )}
        aria-label={`${product.name} sepete ekle`}
      >
        +
      </button>
    </div>
  );
}
