import { PageHeader } from '@/shared/components/layout/PageHeader';
import { OrderStepIndicator } from './OrderStepIndicator';
import { CustomerSelectStep } from './steps/CustomerSelectStep';
import { BranchSelectStep } from './steps/BranchSelectStep';
import { ProductsStep } from './steps/ProductsStep';
import { CartStep } from './steps/CartStep';
import { SaveOrderStep } from './steps/SaveOrderStep';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { useOrderTotals } from '@/features/orders/hooks/useOrderTotals';

const STEP_SUBTITLES = {
  customer: 'Müşteri seçin',
  branch: 'Şube seçin',
  products: 'Ürün ekleyin',
  cart: 'Sepeti kontrol edin',
  save: 'Siparişi kaydedin',
} as const;

export function NewOrderPage() {
  const step = useOrderDraftStore((s) => s.step);
  const customerName = useOrderDraftStore((s) => s.customerName);
  const totals = useOrderTotals();

  const subtitle =
    step === 'customer'
      ? STEP_SUBTITLES.customer
      : step === 'cart' || step === 'save'
        ? `${customerName ?? ''} · ${String(totals.lineCount)} kalem · ${STEP_SUBTITLES[step]}`
        : `${customerName ?? ''} · ${STEP_SUBTITLES[step]}`;

  return (
    <div>
      <PageHeader title="Yeni Sipariş" subtitle={subtitle} />
      <OrderStepIndicator currentStep={step} />

      {step === 'customer' && <CustomerSelectStep />}
      {step === 'branch' && <BranchSelectStep />}
      {step === 'products' && <ProductsStep />}
      {step === 'cart' && <CartStep />}
      {step === 'save' && <SaveOrderStep />}
    </div>
  );
}
