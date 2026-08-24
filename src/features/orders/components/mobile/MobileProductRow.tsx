import { cn, formatCurrency } from '@/shared/utils/cn';
import type { Product } from '@/shared/types/product.types';
import { MobileQtyStepper } from './MobileQtyStepper';

interface MobileProductRowProps {
  product: Product;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  /** Tighter row for Alınan Siparişler strip. */
  compact?: boolean;
  /** Draft/API list price when the product is on the cart; else catalog listPrice. */
  listPrice?: number;
  /** API netPrice after sales conditions; ignored until applied. */
  netPrice?: number;
  salesConditionsApplied?: boolean;
}

function isPositivePrice(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Prefer a real line/API list price; never treat 0 as a locked display price. */
export function resolveShownListPrice(
  lineListPrice: number | undefined,
  catalogListPrice: number,
): number {
  if (isPositivePrice(lineListPrice)) return lineListPrice;
  if (isPositivePrice(catalogListPrice)) return catalogListPrice;
  return 0;
}

export function MobileProductRow({
  product,
  quantity,
  onQuantityChange,
  compact = false,
  listPrice,
  netPrice,
  salesConditionsApplied = false,
}: MobileProductRowProps) {
  const shownListPrice = resolveShownListPrice(listPrice, product.listPrice);
  const showNet =
    salesConditionsApplied &&
    netPrice !== undefined &&
    Number.isFinite(netPrice);

  return (
    <div
      className={cn(
        'border-b border-brand-gray-100',
        compact ? 'py-1.5' : 'py-2',
      )}
    >
      <div className="min-w-0">
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
          {product.sku?.trim()
            ? product.sku
            : product.barcode?.trim()
              ? product.barcode.trim()
              : '—'}
        </p>
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="min-w-0 shrink-0 text-xs text-brand-gray-500">
          Stok: {product.stockQuantity}
        </p>
        <div className="flex min-w-0 flex-col items-end gap-1">
          <p className="max-w-full truncate text-xs font-medium text-brand-navy tabular-nums">
            Liste: {formatCurrency(shownListPrice)}
          </p>
          {showNet ? (
            <p className="max-w-full truncate text-xs font-semibold text-brand-navy tabular-nums">
              Net: {formatCurrency(netPrice)}
            </p>
          ) : null}
          <MobileQtyStepper value={quantity} onChange={onQuantityChange} min={0} />
        </div>
      </div>
    </div>
  );
}
