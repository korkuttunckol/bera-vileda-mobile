import { useMemo } from 'react';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { calculateOrderTotals } from '@/features/orders/utils/orderCalculations';
import { calculateCommercialSummary } from '@/features/orders/utils/orderCommercialSummary';

export function useOrderTotals() {
  const lines = useOrderDraftStore((s) => s.lines);
  return useMemo(() => calculateOrderTotals(lines), [lines]);
}

export function useOrderCommercialSummary() {
  const lines = useOrderDraftStore((s) => s.lines);
  return useMemo(() => calculateCommercialSummary(lines), [lines]);
}
