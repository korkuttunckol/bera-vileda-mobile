import type { Order } from '@/shared/types/order.types';

export interface OrderCreatorLookupUser {
  name: string;
  userCode: string;
}

/** Prefer createdBy; fall back to salesRepId (same value at create). */
export function getOrderCreatorId(
  order: Pick<Order, 'createdBy' | 'salesRepId'>,
): string {
  const createdBy = order.createdBy.trim();
  if (createdBy.length > 0) return createdBy;
  return order.salesRepId.trim();
}

/**
 * Resolve display name from a local users lookup result.
 * Never uses the current session user — Admin must not show their own name
 * for Merch-created orders.
 */
export function resolveOrderCreatorName(
  order: Pick<Order, 'createdBy' | 'salesRepId'>,
  user: OrderCreatorLookupUser | null | undefined,
): string {
  const fallbackId = getOrderCreatorId(order);
  if (user) {
    const name = user.name.trim();
    if (name.length > 0) return name;
    const code = user.userCode.trim();
    if (code.length > 0) return code;
  }
  return fallbackId.length > 0 ? fallbackId : 'Kullanıcı';
}
