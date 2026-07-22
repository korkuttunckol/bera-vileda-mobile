import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { CartLineItem } from '@/features/orders/components/CartLineItem';
import { useOrderDraftStore } from '@/stores/orderDraftStore';

export function CartStep() {
  const lines = useOrderDraftStore((s) => s.lines);
  const updateLineQuantity = useOrderDraftStore((s) => s.updateLineQuantity);
  const removeLine = useOrderDraftStore((s) => s.removeLine);
  const setStep = useOrderDraftStore((s) => s.setStep);

  return (
    <div className="pb-24">
      <div className="space-y-3 p-4">
        {lines.length === 0 ? (
          <EmptyState
            title="Sepetiniz boş"
            description="Ürün eklemek için kataloga dönün."
            action={
              <Button onClick={() => { setStep('products'); }}>
                Ürünlere Dön
              </Button>
            }
          />
        ) : (
          <>
            <div className="space-y-2">
              {lines.map((line) => (
                <CartLineItem
                  key={line.productId}
                  line={line}
                  onQuantityChange={(q) => { updateLineQuantity(line.productId, q); }}
                  onRemove={() => { removeLine(line.productId); }}
                />
              ))}
            </div>

            <Button fullWidth size="lg" onClick={() => { setStep('save'); }}>
              Siparişi Kaydet →
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => { setStep('products'); }}
            >
              ← Ürün Ekle
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
