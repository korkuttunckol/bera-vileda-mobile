import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { orderService } from '../services/orderService';
import type { Order, OrderHistoryFilter } from '@/shared/types/order.types';

export function useOrders(filter: OrderHistoryFilter) {
  const user = useAuthStore((s) => s.user);
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const reload = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [list, pending] = await Promise.all([
        orderService.list(user.uid, user.role, filter),
        orderService.countPending(user.uid, user.role),
      ]);
      setOrders(list);
      setPendingCount(pending);
    } finally {
      setIsLoading(false);
    }
  }, [user, filter]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  return { orders, isLoading, pendingCount, reload };
}
