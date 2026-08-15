import { Card } from '@/shared/components/ui/Card';
import { NumericQuantityInput } from '@/shared/components/form/NumericQuantityInput';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/utils/cn';
import { isProductOutOfStock } from '@/features/orders/utils/stockControl';
import { ProductInfoDisplay } from './ProductInfoDisplay';
import type { Product } from '@/shared/types/product.types';

interface ProductCardProps {
  product: Product;
  mode?: 'catalog' | 'order';
  quantity?: number;
  onQuantityChange?: (qty: number) => void;
  onAdd?: () => void;
  onSelect?: () => void;
  inCartQty?: number;
  selected?: boolean;
}

export function ProductCard({
  product,
  mode = 'catalog',
  quantity = 1,
  onQuantityChange,
  onAdd,
  onSelect,
  inCartQty = 0,
  selected = false,
}: ProductCardProps) {
  const outOfStock = isProductOutOfStock(product);

  return (
    <Card
      padding="md"
      interactive={Boolean(onSelect)}
      className={cn('relative min-w-0', selected && 'list-row-selected')}
      onClick={onSelect}
    >
      {inCartQty > 0 ? (
        <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-navy px-1.5 text-xs font-bold text-white shadow-sm">
          {inCartQty}
        </span>
      ) : null}

      <ProductInfoDisplay
        product={product}
        className="pr-8"
        variant={mode === 'order' ? 'order' : 'default'}
      />

      {mode === 'order' && onAdd && onQuantityChange ? (
        <div
          className="mt-4 flex flex-col gap-3 border-t border-brand-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <NumericQuantityInput
            value={quantity}
            onChange={onQuantityChange}
            size="sm"
          />
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={onAdd}
            disabled={outOfStock}
          >
            {outOfStock ? 'Stok Yok' : 'Ekle'}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
