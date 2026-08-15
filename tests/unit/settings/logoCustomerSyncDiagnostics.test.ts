import { describe, expect, it } from 'vitest';
import {
  buildLogoSalesRepDiagnostic,
  safetyCountsUnchanged,
  type LogoCustomerSyncSafetyCounts,
} from '@/features/settings/services/logoCustomerSyncDiagnostics';
import type { LocalCustomer } from '@/shared/lib/indexeddb/db';

function customer(
  overrides: Partial<LocalCustomer> & Pick<LocalCustomer, 'id' | 'code'>,
): LocalCustomer {
  return {
    localId: overrides.id,
    name: overrides.name ?? 'N',
    salesRepId: 'uid',
    isActive: true,
    isDeleted: false,
    source: 'logo',
    createdAt: 't',
    updatedAt: 't',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'pending',
    ...overrides,
  };
}

describe('logoCustomerSyncDiagnostics', () => {
  it('reports unchanged safety counts', () => {
    const a: LogoCustomerSyncSafetyCounts = {
      branches: 3,
      orders: 10,
      orderLines: 40,
      outbox: 2,
    };
    expect(safetyCountsUnchanged(a, { ...a })).toBe(true);
    expect(
      safetyCountsUnchanged(a, { ...a, branches: 4 }),
    ).toBe(false);
    expect(
      safetyCountsUnchanged(a, { ...a, orders: 11 }),
    ).toBe(false);
    expect(
      safetyCountsUnchanged(a, { ...a, orderLines: 41 }),
    ).toBe(false);
    expect(
      safetyCountsUnchanged(a, { ...a, outbox: 0 }),
    ).toBe(false);
  });

  it('builds SPECODE=2217 diagnostic from logoSalesRepCode (not salesRepId)', () => {
    const list = [
      customer({
        id: '1',
        code: 'A',
        name: 'Acme',
        erpId: '10',
        logoSalesRepCode: '2217',
        salesRepId: 'bera-uid',
      }),
      customer({
        id: '2',
        code: 'B',
        name: 'Beta',
        erpId: '11',
        logoSalesRepCode: '2217',
      }),
      customer({
        id: '3',
        code: 'C',
        name: 'Other',
        logoSalesRepCode: '9999',
      }),
      customer({
        id: '4',
        code: 'D',
        name: 'Deleted',
        logoSalesRepCode: '2217',
        isDeleted: true,
      }),
      customer({
        id: '5',
        code: 'E',
        name: 'Wrong field',
        // salesRepId must NOT count as Logo SPECODE
        salesRepId: '2217',
      }),
    ];

    const diag = buildLogoSalesRepDiagnostic(list, '2217', 5);
    expect(diag.logoSalesRepCode).toBe('2217');
    expect(diag.count).toBe(2);
    expect(diag.samples.map((s) => s.code)).toEqual(['A', 'B']);
    expect(diag.samples.every((s) => s.logoSalesRepCode === '2217')).toBe(
      true,
    );
  });
});
