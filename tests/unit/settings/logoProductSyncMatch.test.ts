import { describe, expect, it } from 'vitest';
import { planLogoRowMatch } from '@/features/settings/services/logoProductSyncService';
import type { LogoMappedProductFields } from '@/features/settings/services/logoProductMapper';
import type { LocalProduct } from '@/shared/lib/indexeddb/db';

function product(
  overrides: Partial<LocalProduct> & Pick<LocalProduct, 'id' | 'sku' | 'barcode'>,
): LocalProduct {
  return {
    localId: overrides.id,
    name: overrides.name ?? 'P',
    category: 'Genel',
    unit: 'Adet',
    listPrice: 1,
    vatRate: 20,
    stockQuantity: 0,
    isActive: true,
    isDeleted: false,
    createdAt: 't',
    updatedAt: 't',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

function mapped(
  partial: Partial<LogoMappedProductFields> &
    Pick<LogoMappedProductFields, 'barcode' | 'sku'>,
): LogoMappedProductFields {
  return {
    name: 'N',
    vatRate: 20,
    stockQuantity: 5,
    listPrice: 10,
    ...partial,
  };
}

describe('planLogoRowMatch', () => {
  it('matches primarily by barcode (CODE)', () => {
    const p = product({ id: 'a', sku: 'SKU1', barcode: 'BC1' });
    const byBarcode = new Map([['BC1', [p]]]);
    const bySku = new Map([['SKU1', [p]]]);
    const plan = planLogoRowMatch(
      mapped({ barcode: 'BC1', sku: 'SKU1', stockQuantity: 9 }),
      byBarcode,
      bySku,
      new Set(),
    );
    expect(plan).toEqual({ action: 'update', product: p, matchedBy: 'barcode' });
  });

  it('falls back to sku when barcode missing locally', () => {
    const p = product({ id: 'a', sku: 'SKU1', barcode: '' });
    const byBarcode = new Map<string, LocalProduct[]>();
    const bySku = new Map([['SKU1', [p]]]);
    const plan = planLogoRowMatch(
      mapped({ barcode: 'NEW-BC', sku: 'SKU1' }),
      byBarcode,
      bySku,
      new Set(),
    );
    expect(plan).toEqual({ action: 'update', product: p, matchedBy: 'sku' });
  });

  it('reports conflict when barcode and sku point to different products', () => {
    const a = product({ id: 'a', sku: 'SA', barcode: 'BC1' });
    const b = product({ id: 'b', sku: 'SB', barcode: 'BC2' });
    const byBarcode = new Map([['BC1', [a]]]);
    const bySku = new Map([
      ['SA', [a]],
      ['SB', [b]],
    ]);
    const plan = planLogoRowMatch(
      mapped({ barcode: 'BC1', sku: 'SB' }),
      byBarcode,
      bySku,
      new Set(),
    );
    expect(plan.action).toBe('conflict');
    if (plan.action === 'conflict') {
      expect(plan.conflict.type).toBe('barcode_sku_cross_match');
    }
  });

  it('reports conflict on sku fallback when existing barcode differs', () => {
    const p = product({ id: 'a', sku: 'SKU1', barcode: 'OLD-BC' });
    const byBarcode = new Map([['OLD-BC', [p]]]);
    const bySku = new Map([['SKU1', [p]]]);
    const plan = planLogoRowMatch(
      mapped({ barcode: 'NEW-BC', sku: 'SKU1' }),
      byBarcode,
      bySku,
      new Set(),
    );
    expect(plan.action).toBe('conflict');
    if (plan.action === 'conflict') {
      expect(plan.conflict.type).toBe('sku_fallback_barcode_mismatch');
    }
  });

  it('creates when neither barcode nor sku matches', () => {
    const plan = planLogoRowMatch(
      mapped({ barcode: 'BC-X', sku: 'SKU-X' }),
      new Map(),
      new Map(),
      new Set(),
    );
    expect(plan).toEqual({ action: 'create' });
  });

  it('reports duplicate Logo barcode without deleting', () => {
    const seen = new Set(['BC1']);
    const plan = planLogoRowMatch(
      mapped({ barcode: 'BC1', sku: 'S1' }),
      new Map(),
      new Map(),
      seen,
    );
    expect(plan.action).toBe('conflict');
    if (plan.action === 'conflict') {
      expect(plan.conflict.type).toBe('duplicate_logo_barcode');
    }
  });
});
