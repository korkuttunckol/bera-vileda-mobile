import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Card } from '@/shared/components/ui/Card';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { useAuthStore } from '@/stores/authStore';
import { orderService } from '@/features/orders/services/orderService';
import { useOrderTotals } from '@/features/orders/hooks/useOrderTotals';
import { toast } from '@/stores/toastStore';
import { ROUTES } from '@/shared/constants/routes';

export function SaveOrderStep() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const draft = useOrderDraftStore();
  const reset = useOrderDraftStore((s) => s.reset);
  const setNotes = useOrderDraftStore((s) => s.setNotes);
  const setStep = useOrderDraftStore((s) => s.setStep);
  const [isSaving, setIsSaving] = useState(false);
  const totals = useOrderTotals();

  const handleSave = async (): Promise<void> => {
    if (!user) return;
    if (!draft.customerId || draft.lines.length === 0) {
      toast('Müşteri ve ürün seçimi gereklidir', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const { order, isOffline } = await orderService.createFromDraft({
        draft,
        userId: user.uid,
        userRole: user.role,
      });

      if (isOffline) {
        toast('Sipariş telefon hafızasına kaydedildi.', 'success');
      } else {
        toast('Sipariş kaydedildi.', 'success');
      }

      reset();
      void navigate(ROUTES.ORDER_SEND.replace(':id', order.id));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Kayıt başarısız', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card padding="md" className="space-y-2">
        <div>
          <p className="text-xs text-brand-gray-500">Müşteri</p>
          <p className="font-medium text-brand-navy">{draft.customerName}</p>
        </div>
        <div>
          <p className="text-xs text-brand-gray-500">Şube</p>
          <p className="font-medium text-brand-navy">{draft.branchName}</p>
        </div>
        <div>
          <p className="text-xs text-brand-gray-500">Kalem / Adet</p>
          <p className="font-medium text-brand-navy">
            {totals.lineCount} kalem · {totals.itemCount} adet
          </p>
        </div>
      </Card>

      <Input
        label="Sipariş Notu (opsiyonel)"
        value={draft.notes ?? ''}
        onChange={(e) => { setNotes(e.target.value); }}
        placeholder="Teslimat veya sipariş notu..."
      />

      <Button
        fullWidth
        size="lg"
        isLoading={isSaving}
        onClick={() => void handleSave()}
      >
        Siparişi Kaydet
      </Button>
      <Button variant="outline" fullWidth onClick={() => { setStep('cart'); }}>
        ← Sepete Dön
      </Button>
    </div>
  );
}
