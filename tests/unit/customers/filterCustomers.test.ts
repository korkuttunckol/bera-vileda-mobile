import { describe, expect, it } from 'vitest';
import { filterCustomers } from '@/shared/lib/indexeddb/repositories/customerRepository';
import type { LocalCustomer } from '@/shared/lib/indexeddb/db';
import { normalizeSearchText } from '@/shared/utils/normalizeSearchText';

function makeCustomer(
  overrides: Partial<LocalCustomer> &
    Pick<LocalCustomer, 'id' | 'code' | 'name'>,
): LocalCustomer {
  return {
    localId: overrides.id,
    salesRepId: 'rep-1',
    source: 'excel',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedBy: 'u1',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

describe('normalizeSearchText', () => {
  it('folds Turkish case and strips diacritics', () => {
    expect(normalizeSearchText('BEŞLER')).toBe('besler');
    expect(normalizeSearchText('Beşler')).toBe('besler');
    expect(normalizeSearchText('besler')).toBe('besler');
    expect(normalizeSearchText('İstanbul')).toBe('istanbul');
    expect(normalizeSearchText('IĞDIR')).toBe('igdir');
  });

  it('coerces non-string values safely', () => {
    expect(normalizeSearchText(null)).toBe('');
    expect(normalizeSearchText(undefined)).toBe('');
    expect(normalizeSearchText(12045)).toBe('12045');
  });
});

describe('filterCustomers search', () => {
  const customers = [
    makeCustomer({
      id: 'afm',
      code: 'C-AFM-01',
      name: 'AFM NAKLİYE GIDA LTD.ŞTİ.',
    }),
    makeCustomer({
      id: 'besler',
      code: 'C-BSL-01',
      name: 'Beşler Market Zinciri',
    }),
    makeCustomer({
      id: 'other',
      code: 'C-OTH-01',
      name: 'Anadolu Temizlik',
    }),
    makeCustomer({
      id: 'passive',
      code: 'C-PAS-01',
      name: 'AFM Pasif',
      isActive: false,
    }),
    makeCustomer({
      id: 'deleted',
      code: 'C-DEL-01',
      name: 'AFM Silinmiş',
      isDeleted: true,
    }),
  ];

  it('matches AFM in title (substring, any position)', () => {
    const result = filterCustomers(customers, {
      search: 'AFM',
      activeFilter: 'active',
    });
    expect(result.map((c) => c.id)).toEqual(['afm']);
    expect(result[0]?.name).toContain('AFM NAKLİYE');
  });

  it('matches AFM case-insensitively', () => {
    const lower = filterCustomers(customers, {
      search: 'afm',
      activeFilter: 'active',
    });
    const mixed = filterCustomers(customers, {
      search: 'AfM',
      activeFilter: 'active',
    });
    expect(lower.map((c) => c.id)).toEqual(['afm']);
    expect(mixed.map((c) => c.id)).toEqual(['afm']);
  });

  it('matches Beşler in title with Turkish characters', () => {
    const withDiacritic = filterCustomers(customers, {
      search: 'Beşler',
      activeFilter: 'active',
    });
    expect(withDiacritic.map((c) => c.id)).toEqual(['besler']);
  });

  it('matches Beşler when typed without diacritics or in caps', () => {
    expect(
      filterCustomers(customers, {
        search: 'besler',
        activeFilter: 'active',
      }).map((c) => c.id),
    ).toEqual(['besler']);
    expect(
      filterCustomers(customers, {
        search: 'BESLER',
        activeFilter: 'active',
      }).map((c) => c.id),
    ).toEqual(['besler']);
    expect(
      filterCustomers(customers, {
        search: 'BEŞLER',
        activeFilter: 'active',
      }).map((c) => c.id),
    ).toEqual(['besler']);
  });

  it('matches customer code substrings', () => {
    const result = filterCustomers(customers, {
      search: 'BSL',
      activeFilter: 'active',
    });
    expect(result.map((c) => c.id)).toEqual(['besler']);
  });

  it('returns full active list when search is empty', () => {
    const result = filterCustomers(customers, {
      search: '   ',
      activeFilter: 'active',
    });
    expect(result.map((c) => c.id).sort()).toEqual(['afm', 'besler', 'other']);
  });

  it('does not throw when code/name are non-strings', () => {
    const dirty = [
      makeCustomer({
        id: 'num-code',
        // Excel/Firestore edge case
        code: 12045 as unknown as string,
        name: 'AFM Sayısal Kod',
      }),
      makeCustomer({
        id: 'nullish',
        code: null as unknown as string,
        name: undefined as unknown as string,
      }),
    ];
    expect(() => filterCustomers(dirty, { search: 'AFM' })).not.toThrow();
    expect(filterCustomers(dirty, { search: 'AFM' }).map((c) => c.id)).toEqual([
      'num-code',
    ]);
  });
});
