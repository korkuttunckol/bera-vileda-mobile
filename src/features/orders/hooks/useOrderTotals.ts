import { useMemo } from 'react';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { calculateOrderTotals } from '@/features/orders/utils/orderCalculations';

export function useOrderTotals() {
  const lines = useOrderDraftStore((s) => s.lines);
  return useMemo(() => calculateOrderTotals(lines), [lines]);
}
