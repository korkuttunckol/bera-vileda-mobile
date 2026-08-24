import { describe, expect, it } from 'vitest';
import { buildNewOrderRoute } from '@/shared/constants/routes';

describe('buildNewOrderRoute', () => {
  it('returns base new order route without customer', () => {
    expect(buildNewOrderRoute()).toBe('/orders/new');
  });

  it('includes encoded customerId query param', () => {
    expect(buildNewOrderRoute('cust-1')).toBe('/orders/new?customerId=cust-1');
  });
});
