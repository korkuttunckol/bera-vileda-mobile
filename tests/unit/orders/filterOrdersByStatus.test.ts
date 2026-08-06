import { describe, expect, it } from 'vitest';
import {
  countPendingOrders,
  filterOrdersByStatus,
} from '@/shared/lib/indexeddb/repositories/orderRepository';
import type { LocalOrder } from '@/shared/lib/indexeddb/db';

function makeOrder(
  overrides: Partial<LocalOrder> & Pick<LocalOrder, 'id' | 'orderSyncStatus'>,
): LocalOrder {
  return {
    localId: overrides.id,
    customerId: 'c1',
    customerCode: 'C001',
    customerName: 'Test',
    salesRepId: 'u1',
    orderDate: '2026-01-01T00:00:00.000Z',
    status: 'submitted',
    syncStatus: 'pending',
    subtotal: 0,
    discountTotal: 0,
    vatTotal: 0,
    grandTotal: 0,
    lineCount: 0,
    createdOffline: true,
    erpSyncStatus: 'none',
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedBy: 'u1',
    version: 1,
    ...overrides,
  };
}

describe('filterOrdersByStatus', () => {
  const orders = [
    makeOrder({ id: 'p1', orderSyncStatus: 'pending_offline' }),
    makeOrder({ id: 's1', orderSyncStatus: 'sending' }),
    makeOrder({ id: 'f1', orderSyncStatus: 'failed' }),
    makeOrder({ id: 'ok', orderSyncStatus: 'sent' }),
    makeOrder({
      id: 'del',
      orderSyncStatus: 'pending_offline',
      isDeleted: true,
    }),
  ];

  it('pending includes waiting, sending, and failed orders', () => {
    const result = filterOrdersByStatus(orders, 'pending');
    expect(result.map((o) => o.id).sort()).toEqual(['f1', 'p1', 's1']);
  });

  it('failed filter is only failed', () => {
    const result = filterOrdersByStatus(orders, 'failed');
    expect(result.map((o) => o.id)).toEqual(['f1']);
  });

  it('all excludes deleted and returns every live status', () => {
    const result = filterOrdersByStatus(orders, 'all');
    expect(result.map((o) => o.id).sort()).toEqual(['f1', 'ok', 'p1', 's1']);
  });

  it('countPendingOrders matches waiting + failed (not sending)', () => {
    expect(countPendingOrders(orders)).toBe(2);
  });
});
