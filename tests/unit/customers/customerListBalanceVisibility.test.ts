import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('CustomerListItem balance visibility', () => {
  it('shows balance only when showBalance prop is enabled', () => {
    const source = readFileSync(
      path.resolve('src/features/customers/components/CustomerListItem.tsx'),
      'utf8',
    );
    expect(source).toContain('showBalance');
    expect(source).toMatch(/showBalance\s*\?\s*\(/);
  });

  it('CustomersPage enables balance on list items', () => {
    const source = readFileSync(
      path.resolve('src/features/customers/components/CustomersPage.tsx'),
      'utf8',
    );
    expect(source).toContain('showBalance');
  });

  it('order customer select does not pass showBalance', () => {
    const source = readFileSync(
      path.resolve('src/features/orders/components/steps/CustomerSelectStep.tsx'),
      'utf8',
    );
    expect(source).not.toContain('showBalance');
  });
});
