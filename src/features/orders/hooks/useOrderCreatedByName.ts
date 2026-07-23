import { useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Order } from '@/shared/types/order.types';

export function useOrderCreatedByName(order: Order | undefined): string {
  const { user } = useAuth();

  return useMemo(() => {
    if (!order) return 'Kullanıcı';
    if (user?.uid === order.createdBy) {
      return user.displayName || user.email || 'Kullanıcı';
    }
    return user?.displayName || user?.email || 'Kullanıcı';
  }, [order, user]);
}
