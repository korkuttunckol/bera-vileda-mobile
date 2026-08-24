import { Button } from '@/shared/components/ui/Button';
import { useOrderTotals } from '@/features/orders/hooks/useOrderTotals';
import { useVisualViewportKeyboard } from '@/shared/hooks/useVisualViewportKeyboard';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { cn } from '@/shared/utils/cn';

interface MobileStickyCartBarProps {
  isSaving: boolean;
  isApplyingSalesConditions?: boolean;
  reviewOpen: boolean;
  salesConditionsReady: boolean;
  lastSavedOrderId: string | null;
  onSave: () => void;
  onShare: () => void;
  onOpenCartLines: () => void;
  onApplySalesConditions?: () => void;
}

export function MobileStickyCartBar({
  isSaving,
  isApplyingSalesConditions = false,
  reviewOpen,
  salesConditionsReady,
  lastSavedOrderId,
  onSave,
  onShare,
  onOpenCartLines,
  onApplySalesConditions,
}: MobileStickyCartBarProps) {
  const customerId = useOrderDraftStore((s) => s.customerId);
  const lineCount = useOrderDraftStore((s) => s.lines.length);
  const totals = useOrderTotals();
  const { keyboardOpen } = useVisualViewportKeyboard();

  const canReview = Boolean(customerId) && lineCount > 0 && !isSaving;
  const canSave = canReview && reviewOpen && salesConditionsReady;
  const canApply =
    Boolean(customerId) &&
    lineCount > 0 &&
    !isSaving &&
    !isApplyingSalesConditions &&
    Boolean(onApplySalesConditions);

  return (
    <div
      className={cn(
        'fixed bottom-16 left-0 right-0 z-30 border-t border-brand-gray-200 bg-white px-3 py-2.5 shadow-lg safe-area-bottom transition-transform duration-200 ease-out',
        keyboardOpen && 'pointer-events-none translate-y-[140%] opacity-0',
      )}
      aria-hidden={keyboardOpen}
    >
      <div className="app-shell space-y-2">
        <button
          type="button"
          onClick={onOpenCartLines}
          className="flex min-h-12 w-full items-center justify-center gap-4 rounded-xl bg-brand-gray-50 px-3 text-sm font-semibold text-brand-navy active:bg-brand-gray-100 disabled:opacity-50"
          disabled={lineCount === 0}
          tabIndex={keyboardOpen ? -1 : undefined}
        >
          <span>Sipariş Özeti · {totals.lineCount} Kalem</span>
          <span className="text-brand-gray-300">·</span>
          <span>{totals.itemCount} Adet</span>
        </button>

        {onApplySalesConditions ? (
          <Button
            variant="outline"
            className="min-h-12 w-full"
            isLoading={isApplyingSalesConditions}
            disabled={!canApply}
            onClick={onApplySalesConditions}
            tabIndex={keyboardOpen ? -1 : undefined}
          >
            Satış Koşullarını Uygula
          </Button>
        ) : null}

        <div className="flex gap-2">
          {lastSavedOrderId ? (
            <Button
              variant="outline"
              className="min-h-12 flex-1"
              onClick={onShare}
              tabIndex={keyboardOpen ? -1 : undefined}
            >
              Paylaş
            </Button>
          ) : null}
          {reviewOpen ? (
            <Button
              className="min-h-12 flex-[2] uppercase tracking-wide"
              size="lg"
              isLoading={isSaving}
              disabled={!canSave}
              onClick={onSave}
              tabIndex={keyboardOpen ? -1 : undefined}
            >
              Siparişi Kaydet
            </Button>
          ) : (
            <Button
              className="min-h-12 flex-[2] uppercase tracking-wide"
              size="lg"
              disabled={!canReview}
              onClick={onOpenCartLines}
              tabIndex={keyboardOpen ? -1 : undefined}
            >
              {salesConditionsReady ? 'Sipariş Özetini Aç' : 'Siparişi Kontrol Et'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
