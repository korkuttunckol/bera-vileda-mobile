import { describe, expect, it } from 'vitest';
import {
  applyCumulativeDiscounts,
  parseDiscountRate,
  parseLogoFormulaRate,
} from '@/features/orders/utils/salesConditionMath';

describe('salesConditionMath', () => {
  it('parses Logo FORMULA after P3*, never taking 3 as the rate', () => {
    expect(parseLogoFormulaRate('P3*.10')).toBe(10);
    expect(parseLogoFormulaRate('P3*.2590/1')).toBeCloseTo(25.9, 4);
    expect(parseLogoFormulaRate('P3*.26/10')).toBeCloseTo(2.6, 4);
    expect(parseDiscountRate('P3')).toBe(0);
    expect(parseDiscountRate('10')).toBe(0);
    expect(parseDiscountRate('%10')).toBe(0);
  });

  it('does not fall back to the first number in CODE/DEFINITION_', () => {
    expect(parseDiscountRate('Kampanya', '15')).toBe(0);
    expect(parseDiscountRate('', '')).toBe(0);
    expect(parseDiscountRate('ISKONTO A', 'ABC')).toBe(0);
  });

  it('applies 1–5 discounts cumulatively on top of each other', () => {
    const net = applyCumulativeDiscounts(100, [10, 5, 0, 0, 0]);
    expect(net).toBeCloseTo(85.5, 2);
  });

  it('matches Logo net for 08171 / 1139', () => {
    const net = applyCumulativeDiscounts(260, [10, 25.9, 2.6, 10]);
    expect(net).toBe(152);
  });
});
