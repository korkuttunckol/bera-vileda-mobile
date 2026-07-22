import { useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { orderService } from '../services/orderService';
import type { Order, OrderLine } from '@/shared/types/order.types';

export function useOrder(orderId: string | undefined) {
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const [order, setOrder] = useState<Order | undefined>();
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(async () => {
    if (!orderId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [loadedOrder, loadedLines] = await Promise.all([
        orderService.getById(orderId),
        orderService.getLines(orderId),
      ]);

      if (!loadedOrder) {
        setNotFound(true);
        setOrder(undefined);
        setLines([]);
        return;
      }

      setNotFound(false);
      setOrder(loadedOrder);
      setLines(loadedLines);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  return { order, lines, isLoading, notFound, reload };
}
