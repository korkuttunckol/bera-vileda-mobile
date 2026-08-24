import { describe, expect, it } from 'vitest';
import { resolveShownListPrice } from '@/features/orders/components/mobile/MobileProductRow';

describe('resolveShownListPrice', () => {
  it('uses a positive line/API list price even when catalog is 0', () => {
    expect(resolveShownListPrice(2830, 0)).toBe(2830);
  });

  it('does not lock the display to 0 when line list price is 0', () => {
    expect(resolveShownListPrice(0, 99)).toBe(99);
  });

  it('does not treat undefined 0-fallback as a real price over catalog', () => {
    expect(resolveShownListPrice(undefined, 50)).toBe(50);
  });
});
