import { Button } from '@/shared/components/ui/Button';
import { useOrderTotals } from '@/features/orders/hooks/useOrderTotals';

interface FloatingCartBarProps {
  onOpenCart: () => void;
}

export function FloatingCartBar({ onOpenCart }: FloatingCartBarProps) {
  const totals = useOrderTotals();

  if (totals.lineCount === 0) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-brand-gray-200 bg-white px-4 py-3 shadow-lg safe-area-bottom">
      <div className="app-shell flex min-w-0 items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-navy">
            {totals.itemCount} adet · {totals.lineCount} kalem
          </p>
        </div>
        <Button onClick={onOpenCart}>Sepete Git</Button>
      </div>
    </div>
  );
}
