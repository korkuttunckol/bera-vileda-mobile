import { Button } from '@/shared/components/ui/Button';
import { formatCurrency } from '@/shared/utils/cn';
import { useOrderTotals } from '@/features/orders/hooks/useOrderTotals';
import { useOrderDraftStore } from '@/stores/orderDraftStore';

interface MobileStickyCartBarProps {
  isSaving: boolean;
  lastSavedOrderId: string | null;
  onSave: () => void;
  onShare: () => void;
  onOpenCartLines: () => void;
}

export function MobileStickyCartBar({
  isSaving,
  lastSavedOrderId,
  onSave,
  onShare,
  onOpenCartLines,
}: MobileStickyCartBarProps) {
  const customerId = useOrderDraftStore((s) => s.customerId);
  const lineCount = useOrderDraftStore((s) => s.lines.length);
  const totals = useOrderTotals();

  const canSave = Boolean(customerId) && lineCount > 0 && !isSaving;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-brand-gray-200 bg-white px-3 py-3 shadow-lg safe-area-bottom">
      <div className="app-shell space-y-2">
        <button
          type="button"
          onClick={onOpenCartLines}
          className="flex min-h-11 w-full items-center justify-between rounded-xl bg-brand-gray-50 px-3 text-left active:bg-brand-gray-100"
          disabled={lineCount === 0}
        >
          <span className="text-sm font-semibold text-brand-navy">
            {totals.itemCount} adet · {totals.lineCount} kalem
          </span>
          <span className="text-sm font-bold text-brand-navy">
            {formatCurrency(totals.grandTotal)}
          </span>
        </button>

        <div className="flex gap-2">
          {lastSavedOrderId ? (
            <Button
              variant="outline"
              className="min-h-11 flex-1"
              onClick={onShare}
            >
              Paylaş
            </Button>
          ) : null}
          <Button
            className="min-h-11 flex-[2]"
            size="lg"
            isLoading={isSaving}
            disabled={!canSave}
            onClick={onSave}
          >
            Siparişi Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}
