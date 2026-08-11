import { describe, expect, it } from 'vitest';
import { filterCustomers } from '@/shared/lib/indexeddb/repositories/customerRepository';
import {
  filterCustomersForOrderPicker,
  visibleOrderPickerCustomers,
} from '@/features/orders/utils/customerPickerSearch';
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

/** Pre-fix search branch (main before PR #18) — documents AFM crash. */
function legacyFilterCustomersThrowsOnDirtyCode(
  customers: LocalCustomer[],
  search: string,
): LocalCustomer[] {
  const term = search.trim().toLocaleLowerCase('tr-TR');
  return customers.filter(
    (c) =>
      c.code.toLocaleLowerCase('tr-TR').includes(term) ||
      c.name.toLocaleLowerCase('tr-TR').includes(term),
  );
}

const afm = makeCustomer({
  id: 'afm',
  code: 'C-AFM-01',
  name: 'AFM NAKLİYE GIDA LTD.ŞTİ.',
});

const besler = makeCustomer({
  id: 'besler',
  code: 'C-BSL-01',
  name: 'Beşler Market Zinciri',
});

const other = makeCustomer({
  id: 'other',
  code: 'C-OTH-01',
  name: 'Anadolu Temizlik',
});

const dirtyNumericCode = makeCustomer({
  id: 'dirty',
  code: 12045 as unknown as string,
  name: 'Zararsız Ünvan',
});

describe('normalizeSearchText', () => {
  it('folds Turkish case and strips diacritics', () => {
    expect(normalizeSearchText('BEŞLER')).toBe('besler');
    expect(normalizeSearchText('Beşler')).toBe('besler');
    expect(normalizeSearchText('besler')).toBe('besler');
    expect(normalizeSearchText('İstanbul')).toBe('istanbul');
    expect(normalizeSearchText('IĞDIR')).toBe('igdir');
  });

  it('coerces non-string values and strips zero-width chars', () => {
    expect(normalizeSearchText(null)).toBe('');
    expect(normalizeSearchText(undefined)).toBe('');
    expect(normalizeSearchText(12045)).toBe('12045');
    expect(normalizeSearchText('AFM\u200b')).toBe('afm');
    expect(normalizeSearchText('\u200bAFM')).toBe('afm');
    expect(normalizeSearchText('ＡＦＭ')).toBe('afm');
  });
});

describe('legacy filterCustomers (root cause for AFM)', () => {
  it('matches AFM on clean data (proves includes was not the bug)', () => {
    expect(
      legacyFilterCustomersThrowsOnDirtyCode([afm, besler, other], 'AFM').map(
        (c) => c.id,
      ),
    ).toEqual(['afm']);
  });

  it('throws when any code is non-string — empty search never hit this path', () => {
    const mixed = [afm, dirtyNumericCode, besler];
    // Empty-path equivalent: no search branch → list still usable
    expect(
      filterCustomers(mixed, { activeFilter: 'active' }).map((c) => c.id).sort(),
    ).toEqual(['afm', 'besler', 'dirty']);

    // Typing AFM entered the search branch and crashed the whole filter
    expect(() =>
      legacyFilterCustomersThrowsOnDirtyCode(mixed, 'AFM'),
    ).toThrow(/toLocaleLowerCase is not a function/);
  });
});

describe('filterCustomers search', () => {
  const customers = [
    afm,
    besler,
    other,
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
    expect(result[0]?.name).toBe('AFM NAKLİYE GIDA LTD.ŞTİ.');
  });

  it('matches AFM case-insensitively and with IME zero-width junk', () => {
    expect(
      filterCustomers(customers, {
        search: 'afm',
        activeFilter: 'active',
      }).map((c) => c.id),
    ).toEqual(['afm']);
    expect(
      filterCustomers(customers, {
        search: 'AfM',
        activeFilter: 'active',
      }).map((c) => c.id),
    ).toEqual(['afm']);
    expect(
      filterCustomers(customers, {
        search: 'AFM\u200b',
        activeFilter: 'active',
      }).map((c) => c.id),
    ).toEqual(['afm']);
  });

  it('matches Beşler in title with Turkish characters', () => {
    expect(
      filterCustomers(customers, {
        search: 'Beşler',
        activeFilter: 'active',
      }).map((c) => c.id),
    ).toEqual(['besler']);
  });

  it('matches Beşler when typed without diacritics or in caps', () => {
    for (const search of ['besler', 'BESLER', 'BEŞLER', 'Beşler']) {
      expect(
        filterCustomers(customers, { search, activeFilter: 'active' }).map(
          (c) => c.id,
        ),
        search,
      ).toEqual(['besler']);
    }
  });

  it('matches customer code substrings', () => {
    expect(
      filterCustomers(customers, {
        search: 'BSL',
        activeFilter: 'active',
      }).map((c) => c.id),
    ).toEqual(['besler']);
  });

  it('returns full active list when search is empty', () => {
    const result = filterCustomers(customers, {
      search: '   ',
      activeFilter: 'active',
    });
    expect(result.map((c) => c.id).sort()).toEqual(['afm', 'besler', 'other']);
  });

  it('does not throw when code/name are non-strings and still finds AFM', () => {
    const dirty = [
      makeCustomer({
        id: 'num-code',
        code: 12045 as unknown as string,
        name: 'AFM Sayısal Kod',
      }),
      dirtyNumericCode,
      afm,
      makeCustomer({
        id: 'nullish',
        code: null as unknown as string,
        name: undefined as unknown as string,
      }),
    ];
    expect(() =>
      filterCustomers(dirty, { search: 'AFM', activeFilter: 'active' }),
    ).not.toThrow();
    expect(
      filterCustomers(dirty, { search: 'AFM', activeFilter: 'active' }).map(
        (c) => c.id,
      ),
    ).toEqual(['afm', 'num-code']);
  });
});

describe('Yeni Sipariş → Müşteri seç search flow', () => {
  const catalog = [afm, besler, other, dirtyNumericCode];

  it('useCachedCustomers-equivalent path finds real AFM cari', () => {
    const result = filterCustomersForOrderPicker(catalog, 'AFM');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('AFM NAKLİYE GIDA LTD.ŞTİ.');
  });

  it('useCachedCustomers-equivalent path finds Beşler / besler', () => {
    expect(filterCustomersForOrderPicker(catalog, 'Beşler').map((c) => c.id)).toEqual([
      'besler',
    ]);
    expect(filterCustomersForOrderPicker(catalog, 'besler').map((c) => c.id)).toEqual([
      'besler',
    ]);
  });

  it('shows all search matches (no empty-list 40-cap)', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      makeCustomer({
        id: `x${String(i)}`,
        code: `X-${String(i)}`,
        name: `AFM Clone ${String(i)}`,
      }),
    );
    const filtered = filterCustomersForOrderPicker(many, 'AFM');
    expect(filtered).toHaveLength(50);
    expect(visibleOrderPickerCustomers(filtered, 'AFM')).toHaveLength(50);
    expect(visibleOrderPickerCustomers(filtered, '')).toHaveLength(40);
  });

  it('activeFilter does not drop active AFM', () => {
    const result = filterCustomersForOrderPicker(
      [
        afm,
        makeCustomer({
          id: 'passive-afm',
          code: 'P',
          name: 'AFM Pasif',
          isActive: false,
        }),
      ],
      'AFM',
    );
    expect(result.map((c) => c.id)).toEqual(['afm']);
  });
});
