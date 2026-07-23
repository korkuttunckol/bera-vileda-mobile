import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { usePendingSyncCount } from '@/features/sync/hooks/usePendingSyncCount';
import { orderService } from '../services/orderService';
import type { Order, OrderHistoryFilter } from '@/shared/types/order.types';

export function useOrders(filter: OrderHistoryFilter) {
  const user = useAuthStore((s) => s.user);
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const pendingCount = usePendingSyncCount();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const list = await orderService.list(user.uid, user.role, filter);
      setOrders(list);
    } finally {
      setIsLoading(false);
    }
  }, [user, filter]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  return { orders, isLoading, pendingCount, reload };
}
