import { describe, expect, it } from 'vitest';
import { formatLogoDate } from '@/features/customers/utils/logoDateFormat';

describe('formatLogoDate', () => {
  it('changes Logo YYYY-MM-DD dates to DD-MM-YYYY', () => {
    expect(formatLogoDate('2026-03-16')).toBe('16-03-2026');
    expect(formatLogoDate('2026-03-16 14:30')).toBe('16-03-2026 14:30');
  });

  it('keeps unknown values and handles empty dates', () => {
    expect(formatLogoDate('16.03.2026')).toBe('16.03.2026');
    expect(formatLogoDate(null)).toBe('');
  });
});
