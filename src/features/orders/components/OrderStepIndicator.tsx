import { cn } from '@/shared/utils/cn';
import {
  ORDER_FLOW_STEPS,
  type OrderFlowStep,
} from '@/features/orders/types/orderFlow.types';

interface OrderStepIndicatorProps {
  currentStep: OrderFlowStep;
}

export function OrderStepIndicator({ currentStep }: OrderStepIndicatorProps) {
  const currentIndex = ORDER_FLOW_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-1 overflow-x-auto px-4 py-3">
      {ORDER_FLOW_STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isDone = index < currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                isActive
                  ? 'bg-brand-navy text-white'
                  : isDone
                    ? 'bg-brand-navy/20 text-brand-navy'
                    : 'bg-brand-gray-200 text-brand-gray-400',
              )}
            >
              {isDone ? '✓' : index + 1}
            </div>
            <span
              className={cn(
                'mr-2 hidden text-xs font-medium sm:inline',
                isActive ? 'text-brand-navy' : 'text-brand-gray-400',
              )}
            >
              {step.label}
            </span>
            {index < ORDER_FLOW_STEPS.length - 1 ? (
              <div
                className={cn(
                  'h-px w-4 shrink-0',
                  isDone ? 'bg-brand-navy/40' : 'bg-brand-gray-200',
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
