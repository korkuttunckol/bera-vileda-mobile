import { describe, expect, it } from 'vitest';
import {
  filterProducts,
  uniqueProductGroupCodes,
} from '@/shared/lib/indexeddb/repositories/productRepository';
import type { LocalProduct } from '@/shared/lib/indexeddb/db';

function makeProduct(
  overrides: Partial<LocalProduct> & Pick<LocalProduct, 'id' | 'name' | 'sku'>,
): LocalProduct {
  return {
    localId: overrides.id,
    category: 'Genel',
    unit: 'Adet',
    listPrice: 10,
    vatRate: 20,
    stockQuantity: 1,
    specialCode5: 'BERA',
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

describe('filterProducts', () => {
  const products = [
    makeProduct({ id: 'a1', name: 'Aktif Bez', sku: 'A1', isActive: true }),
    makeProduct({ id: 'p1', name: 'Pasif Bez', sku: 'P1', isActive: false }),
    makeProduct({
      id: 'd1',
      name: 'Silinmiş',
      sku: 'D1',
      isActive: false,
      isDeleted: true,
    }),
  ];

  it('all excludes deleted and keeps active + passive', () => {
    const result = filterProducts(products, { activeFilter: 'all' });
    expect(result.map((p) => p.id).sort()).toEqual(['a1', 'p1']);
  });

  it('active filter', () => {
    const result = filterProducts(products, { activeFilter: 'active' });
    expect(result.map((p) => p.id)).toEqual(['a1']);
  });

  it('passive filter', () => {
    const result = filterProducts(products, { activeFilter: 'passive' });
    expect(result.map((p) => p.id)).toEqual(['p1']);
  });

  it('never shows a non-BERA stock card, including in the all filter', () => {
    const result = filterProducts(
      [
        makeProduct({ id: 'bera', name: 'Bera Ürün', sku: 'B1' }),
        makeProduct({
          id: 'other',
          name: 'Başka Portföy',
          sku: 'O1',
          specialCode5: 'DİĞER',
        }),
        makeProduct({ id: 'legacy', name: 'Eski Kart', sku: 'E1', specialCode5: undefined }),
      ],
      { activeFilter: 'all' },
    );

    expect(result.map((product) => product.id)).toEqual(['bera']);
  });
});

describe('filterProducts Turkish-normalized search', () => {
  const catalog = [
    makeProduct({
      id: 'spino',
      name: 'Spino Temizlik Bezi',
      sku: 'SPN-01',
      barcode: '8690123456789',
    }),
    makeProduct({
      id: 'turbo',
      name: 'Turbo Mop',
      sku: 'TRB-22',
      barcode: '8690987654321',
    }),
    makeProduct({
      id: 'besler',
      name: 'Beşler Mikrofiber',
      sku: 'BSL-09',
      barcode: '8690555666777',
    }),
    makeProduct({
      id: 'duru-bulgur',
      name: 'Duru Pilavlık Bulgur',
      sku: 'DRB-01',
    }),
    makeProduct({
      id: 'duru-pirinc',
      name: 'Duru Baldo Pirinç',
      sku: 'DRP-01',
    }),
    makeProduct({
      id: 'other',
      name: 'Zemin Bezi',
      sku: 'ZB-1',
    }),
  ];

  it('matches Spino / spıno / SPINO to the same product', () => {
    for (const search of ['Spino', 'spıno', 'SPINO', 'spino']) {
      expect(
        filterProducts(catalog, { search }).map((p) => p.id),
        search,
      ).toEqual(['spino']);
    }
  });

  it('matches Turkish diacritics in product name (Beşler / besler)', () => {
    expect(
      filterProducts(catalog, { search: 'Beşler' }).map((p) => p.id),
    ).toEqual(['besler']);
    expect(
      filterProducts(catalog, { search: 'besler' }).map((p) => p.id),
    ).toEqual(['besler']);
    expect(
      filterProducts(catalog, { search: 'BESLER' }).map((p) => p.id),
    ).toEqual(['besler']);
  });

  it('matches product sku substring', () => {
    expect(filterProducts(catalog, { search: 'spn' }).map((p) => p.id)).toEqual(
      ['spino'],
    );
    expect(
      filterProducts(catalog, { search: 'TRB-22' }).map((p) => p.id),
    ).toEqual(['turbo']);
  });

  it('matches barcode substring and exact barcode', () => {
    expect(
      filterProducts(catalog, { search: '8690123' }).map((p) => p.id),
    ).toEqual(['spino']);
    expect(
      filterProducts(catalog, { search: '8690123456789' }).map((p) => p.id),
    ).toEqual(['spino']);
  });

  it('keeps existing Turbo search behavior', () => {
    expect(
      filterProducts(catalog, { search: 'turbo' }).map((p) => p.id),
    ).toEqual(['turbo']);
    expect(
      filterProducts(catalog, { search: 'TURBO' }).map((p) => p.id),
    ).toEqual(['turbo']);
  });

  it('requires every typed word for multi-word product searches', () => {
    expect(
      filterProducts(catalog, { search: 'duru bulgur' }).map((p) => p.id),
    ).toEqual(['duru-bulgur']);
  });
});

describe('filterProducts groupCode', () => {
  const catalog = [
    makeProduct({
      id: 'v1',
      name: 'Vileda Bez',
      sku: 'V1',
      groupCode: 'VİLEDA',
    }),
    makeProduct({
      id: 'v2',
      name: 'Vileda Mop',
      sku: 'V2',
      groupCode: ' VİLEDA ',
    }),
    makeProduct({
      id: 'o1',
      name: 'Diğer Bez',
      sku: 'O1',
      groupCode: 'DİĞER',
    }),
    makeProduct({
      id: 'n1',
      name: 'Grupsuz Bez',
      sku: 'N1',
    }),
    makeProduct({
      id: 'd1',
      name: 'Silinmiş Vileda',
      sku: 'D1',
      groupCode: 'VİLEDA',
      isDeleted: true,
    }),
  ];

  it('Tümü / empty groupCode keeps search and sort unchanged', () => {
    const all = filterProducts(catalog, { activeFilter: 'all' });
    const withEmpty = filterProducts(catalog, {
      activeFilter: 'all',
      groupCode: '',
    });
    expect(all.map((p) => p.id)).toEqual(['o1', 'n1', 'v1', 'v2']);
    expect(withEmpty.map((p) => p.id)).toEqual(all.map((p) => p.id));
  });

  it('filters to a single group code and keeps name sort', () => {
    expect(
      filterProducts(catalog, { groupCode: 'VİLEDA' }).map((p) => p.id),
    ).toEqual(['v1', 'v2']);
  });

  it('combines group filter with search', () => {
    expect(
      filterProducts(catalog, { groupCode: 'VİLEDA', search: 'mop' }).map(
        (p) => p.id,
      ),
    ).toEqual(['v2']);
  });

  it('does not invent a bucket for missing group codes', () => {
    expect(
      filterProducts(catalog, { groupCode: 'VİLEDA' }).map((p) => p.id),
    ).not.toContain('n1');
  });
});

describe('uniqueProductGroupCodes', () => {
  it('returns unique trimmed codes with Tümü left to the UI', () => {
    const products = [
      makeProduct({ id: 'a', name: 'A', sku: 'A', groupCode: 'VİLEDA' }),
      makeProduct({ id: 'b', name: 'B', sku: 'B', groupCode: ' VİLEDA ' }),
      makeProduct({ id: 'c', name: 'C', sku: 'C', groupCode: 'DİĞER' }),
      makeProduct({ id: 'd', name: 'D', sku: 'D', groupCode: '' }),
      makeProduct({
        id: 'e',
        name: 'E',
        sku: 'E',
        groupCode: 'VİLEDA',
        isDeleted: true,
      }),
    ];

    expect(uniqueProductGroupCodes(products)).toEqual(['DİĞER', 'VİLEDA']);
  });
});
