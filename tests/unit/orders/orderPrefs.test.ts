import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getRecentCustomers,
  rememberRecentCustomer,
  getRecentProductIds,
  rememberRecentProduct,
  getLastBranchForCustomer,
  rememberLastBranch,
} from '@/features/orders/hooks/orderPrefs';

function installLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
}

describe('orderPrefs', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('remembers recent customers newest-first', () => {
    rememberRecentCustomer({ id: 'c1', name: 'A', code: 'A1' });
    rememberRecentCustomer({ id: 'c2', name: 'B', code: 'B1' });
    rememberRecentCustomer({ id: 'c1', name: 'A', code: 'A1' });

    const recent = getRecentCustomers(5);
    expect(recent.map((r) => r.id)).toEqual(['c1', 'c2']);
  });

  it('stores last branch per customer', () => {
    rememberLastBranch('c1', { branchId: 'b1', branchName: 'Şube 1' });
    expect(getLastBranchForCustomer('c1')).toEqual({
      branchId: 'b1',
      branchName: 'Şube 1',
    });
    expect(getLastBranchForCustomer('missing')).toBeNull();
  });

  it('tracks recent product ids for favorites strip', () => {
    rememberRecentProduct('p1');
    rememberRecentProduct('p2');
    rememberRecentProduct('p1');
    expect(getRecentProductIds(8)).toEqual(['p1', 'p2']);
  });
});
