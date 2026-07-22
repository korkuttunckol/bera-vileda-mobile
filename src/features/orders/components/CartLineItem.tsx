import { NumericQuantityInput } from '@/shared/components/form/NumericQuantityInput';
import { Badge } from '@/shared/components/ui/Badge';
import { isProductOutOfStock } from '@/features/orders/utils/stockControl';
import type { OrderDraftLine } from '@/features/orders/types/orderFlow.types';

interface CartLineItemProps {
  line: OrderDraftLine;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartLineItem({
  line,
  onQuantityChange,
  onRemove,
}: CartLineItemProps) {
  const isOutOfStock = isProductOutOfStock(line);

  return (
    <div className="rounded-xl border border-brand-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-brand-navy">{line.productName}</p>
          <p className="text-sm text-brand-gray-500">{line.productSku}</p>
          {line.productBarcode ? (
            <p className="mt-0.5 text-xs text-brand-gray-400">
              Barkod: {line.productBarcode}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-brand-gray-400">
              Depo stok: {line.stockQuantity} {line.unit}
            </p>
            {isOutOfStock ? (
              <Badge
                label="Stok Yok"
                variant="passive"
                className="!bg-red-100 !text-red-700"
              />
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          Sil
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-medium text-brand-gray-500">Sipariş Adedi</span>
        <NumericQuantityInput
          value={line.quantity}
          onChange={onQuantityChange}
          min={1}
          size="sm"
        />
      </div>
    </div>
  );
}
