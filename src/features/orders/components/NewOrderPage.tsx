import { PageHeader } from '@/shared/components/layout/PageHeader';
import { MobileOrderScreen } from './mobile/MobileOrderScreen';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { useOrderTotals } from '@/features/orders/hooks/useOrderTotals';

/**
 * New order entry — single mobile screen.
 * Existing 5-step wizard state machine remains in orderDraftStore; UI no longer shows steps.
 *
 * Layout: fill MainLayout main (overflow hidden) so MobileOrderScreen can pin
 * the product search outside the product-list scrollport.
 */
export function NewOrderPage() {
  const customerName = useOrderDraftStore((s) => s.customerName);
  const totals = useOrderTotals();

  const subtitle = customerName
    ? `${customerName} · ${String(totals.lineCount)} kalem`
    : 'Hızlı sipariş';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Yeni Sipariş"
        subtitle={subtitle}
        sticky={false}
        className="shrink-0"
      />
      <MobileOrderScreen />
    </div>
  );
}
