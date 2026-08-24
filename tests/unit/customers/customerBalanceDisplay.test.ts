import { describe, expect, it } from 'vitest';
import {
  formatCustomerBalanceDisplay,
  resolveCustomerBalanceKind,
} from '@/features/customers/utils/customerBalanceDisplay';

describe('customerBalanceDisplay', () => {
  it('shows Borç for positive balance', () => {
    const display = formatCustomerBalanceDisplay(1250.5);
    expect(display.kind).toBe('debit');
    expect(display.label).toBe('Borç');
    expect(display.amountText).toContain('₺');
  });

  it('shows Alacak with absolute amount for negative balance', () => {
    const display = formatCustomerBalanceDisplay(-850);
    expect(display.kind).toBe('credit');
    expect(display.label).toBe('Alacak');
    expect(display.amountText).not.toContain('-');
    expect(display.amountText).toContain('850');
  });

  it('shows em dash for zero balance', () => {
    const display = formatCustomerBalanceDisplay(0);
    expect(display.kind).toBe('zero');
    expect(display.label).toBe('—');
    expect(display.amountText).toBe('—');
  });

  it('treats undefined balance as zero', () => {
    expect(resolveCustomerBalanceKind(undefined)).toBe('zero');
    expect(formatCustomerBalanceDisplay(undefined).label).toBe('—');
  });
});
