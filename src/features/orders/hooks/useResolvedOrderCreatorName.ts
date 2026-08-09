import { useEffect, useState } from 'react';
import { userLocalRepository } from '@/shared/lib/indexeddb/repositories/userRepository';
import {
  getOrderCreatorId,
  resolveOrderCreatorName,
} from '../utils/resolveOrderCreatorName';
import type { Order } from '@/shared/types/order.types';

/**
 * Local users lookup for order creator display on Geçmiş.
 * Do not use useOrderCreatedByName here — it falls back to the session user.
 */
export function useResolvedOrderCreatorName(order: Order): string {
  const creatorId = getOrderCreatorId(order);
  const [label, setLabel] = useState(creatorId || 'Kullanıcı');

  useEffect(() => {
    let cancelled = false;

    if (!creatorId) {
      setLabel('Kullanıcı');
      return;
    }

    void userLocalRepository.findByCode(creatorId).then((user) => {
      if (cancelled) return;
      setLabel(
        resolveOrderCreatorName(
          { createdBy: creatorId, salesRepId: creatorId },
          user,
        ),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  return label;
}
