import { PageHeader } from '@/shared/components/layout/PageHeader';
import { MobileOrderScreen } from './mobile/MobileOrderScreen';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { useOrderTotals } from '@/features/orders/hooks/useOrderTotals';

/**
 * New order entry — single mobile screen.
 * Existing 5-step wizard state machine remains in orderDraftStore; UI no longer shows steps.
 */
export function NewOrderPage() {
  const customerName = useOrderDraftStore((s) => s.customerName);
  const totals = useOrderTotals();

  const subtitle = customerName
    ? `${customerName} · ${String(totals.lineCount)} kalem`
    : 'Hızlı sipariş';

  return (
    <div>
      <PageHeader title="Yeni Sipariş" subtitle={subtitle} />
      <MobileOrderScreen />
    </div>
  );
}
