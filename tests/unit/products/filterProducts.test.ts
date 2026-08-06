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
