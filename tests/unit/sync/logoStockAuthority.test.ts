import { describe, expect, it } from 'vitest';
import { conflictResolver } from '@/shared/lib/sync/ConflictResolver';
import {
  applyLogoStockOverlays,
  buildLogoStockOverlayIndex,
  preserveLogoStockFields,
} from '@/shared/lib/sync/logoStockAuthority';
import type { Product } from '@/shared/types/product.types';

function makeProduct(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    localId: overrides.id,
    sku: 'SKU-1',
    name: 'Ürün',
    category: 'Genel',
    unit: 'Adet',
    barcode: 'BC-1',
    listPrice: 10,
    vatRate: 20,
    stockQuantity: 0,
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

describe('logoStockAuthority', () => {
  it('A) Logo stock overlay keeps MERKEZ value 50', () => {
    const local = makeProduct({
      id: 'p1',
      stockQuantity: 50,
      stockSource: 'logo',
      lastLogoSyncedAt: '2026-08-01T10:00:00.000Z',
    });
    const remote = makeProduct({
      id: 'p1',
      stockQuantity: 999,
      version: 9,
      name: 'Remote Name',
    });

    const result = preserveLogoStockFields(local, remote);
    expect(result.stockQuantity).toBe(50);
    expect(result.stockSource).toBe('logo');
    expect(result.lastLogoSyncedAt).toBe('2026-08-01T10:00:00.000Z');
    expect(result.name).toBe('Remote Name');
  });

  it('B) local Logo 50 vs remote 30 → 50', () => {
    const local = makeProduct({
      id: 'p1',
      stockQuantity: 50,
      stockSource: 'logo',
      version: 1,
    });
    const remote = makeProduct({
      id: 'p1',
      stockQuantity: 30,
      version: 5,
    });
    const resolved = conflictResolver.resolve(local, remote).resolved;
    expect(resolved.stockQuantity).toBe(30); // version would pick remote
    expect(preserveLogoStockFields(local, resolved).stockQuantity).toBe(50);
  });

  it('C) local Logo 50 vs remote 70 → 50', () => {
    const local = makeProduct({
      id: 'p1',
      stockQuantity: 50,
      stockSource: 'logo',
      version: 1,
    });
    const remote = makeProduct({
      id: 'p1',
      stockQuantity: 70,
      version: 99,
    });
    const resolved = conflictResolver.resolve(local, remote).resolved;
    expect(preserveLogoStockFields(local, resolved).stockQuantity).toBe(50);
  });

  it('D) full-replace style overlay restores Logo stock after remote list', () => {
    const locals = [
      makeProduct({
        id: 'p1',
        sku: 'SKU-1',
        barcode: 'BC-1',
        stockQuantity: 50,
        stockSource: 'logo',
        lastLogoSyncedAt: 't1',
      }),
    ];
    const remotes = [
      makeProduct({
        id: 'p1',
        sku: 'SKU-1',
        barcode: 'BC-1',
        stockQuantity: 30,
        name: 'From Firestore',
        version: 3,
      }),
    ];
    const index = buildLogoStockOverlayIndex(locals);
    const merged = applyLogoStockOverlays(remotes, index);
    expect(merged[0]?.stockQuantity).toBe(50);
    expect(merged[0]?.stockSource).toBe('logo');
    expect(merged[0]?.name).toBe('From Firestore');
  });

  it('H) non-logo local keeps ConflictResolver / remote stock behavior', () => {
    const local = makeProduct({
      id: 'p1',
      stockQuantity: 50,
      stockSource: 'excel',
      version: 1,
    });
    const remote = makeProduct({
      id: 'p1',
      stockQuantity: 70,
      version: 2,
    });
    const resolved = conflictResolver.resolve(local, remote).resolved;
    expect(preserveLogoStockFields(local, resolved).stockQuantity).toBe(70);

    const noSource = makeProduct({
      id: 'p2',
      stockQuantity: 11,
      version: 1,
    });
    const remote2 = makeProduct({
      id: 'p2',
      stockQuantity: 22,
      version: 3,
    });
    const resolved2 = conflictResolver.resolve(noSource, remote2).resolved;
    expect(preserveLogoStockFields(noSource, resolved2).stockQuantity).toBe(22);
  });
});
