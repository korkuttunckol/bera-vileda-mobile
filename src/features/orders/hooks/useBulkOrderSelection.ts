import { useCallback, useMemo, useState } from 'react';
import type { Order } from '@/shared/types/order.types';

export interface BulkOrderSelectionStats {
  selectedOrderCount: number;
  selectedCustomerCount: number;
  totalLines: number;
  totalQuantity: number;
}

export function useBulkOrderSelection(orders: Order[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.includes(order.id)),
    [orders, selectedIds],
  );

  const stats = useMemo<BulkOrderSelectionStats>(() => {
    const uniqueCustomers = new Set(selectedOrders.map((order) => order.customerId));
    return {
      selectedOrderCount: selectedOrders.length,
      selectedCustomerCount: uniqueCustomers.size,
      totalLines: selectedOrders.reduce((sum, order) => sum + order.lineCount, 0),
      totalQuantity: selectedOrders.reduce(
        (sum, order) => sum + (order.itemCount ?? 0),
        0,
      ),
    };
  }, [selectedOrders]);

  const isSelected = (orderId: string): boolean => selectedIds.includes(orderId);

  const toggleOrder = useCallback((orderId: string): void => {
    setSelectedIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }, []);

  const clearSelection = useCallback((): void => {
    setSelectedIds([]);
  }, []);

  return {
    selectedIds,
    selectedOrders,
    stats,
    isSelected,
    toggleOrder,
    clearSelection,
    setSelectedIds,
  };
}
