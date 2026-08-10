import { cn } from '@/shared/utils/cn';
import type { Product } from '@/shared/types/product.types';
import { MobileQtyStepper } from './MobileQtyStepper';

interface MobileProductRowProps {
  product: Product;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  /** Tighter row for favorites strip. */
  compact?: boolean;
}

export function MobileProductRow({
  product,
  quantity,
  onQuantityChange,
  compact = false,
}: MobileProductRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-brand-gray-100',
        compact ? 'min-h-12 py-1.5' : 'min-h-14 py-2',
      )}
    >
      <div className="min-w-0 flex-1">
        {product.barcode?.trim() ? (
          <p className="truncate text-xs text-brand-gray-500">{product.barcode.trim()}</p>
        ) : null}
        <p
          className={cn(
            'truncate font-semibold text-brand-navy',
            compact ? 'text-sm' : 'text-[15px]',
          )}
        >
          {product.name}
        </p>
        <p className="truncate text-xs text-brand-gray-500">
          {product.sku}
          <span className="text-brand-gray-400"> · </span>
          Stok:{product.stockQuantity}
        </p>
      </div>
      <MobileQtyStepper value={quantity} onChange={onQuantityChange} min={0} />
    </div>
  );
}
