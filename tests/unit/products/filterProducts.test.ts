import { describe, expect, it } from 'vitest';
import { filterProducts } from '@/shared/lib/indexeddb/repositories/productRepository';
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
});
