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
    Pick<LogoMappedProductFields, 'barcode' | 'sku' | 'erpId'>,
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
  it('matches primarily by erpId (LOGICALREF)', () => {
    const p = product({ id: 'a', sku: 'SKU1', barcode: 'OLD', erpId: '100' });
    const plan = planLogoRowMatch(
      mapped({ erpId: '100', barcode: 'NEW-BC', sku: 'SKU1', stockQuantity: 9 }),
      new Map([['100', [p]]]),
      new Map([['OLD', [p]]]),
      new Map([['SKU1', [p]]]),
      new Set(),
    );
    expect(plan).toEqual({ action: 'update', product: p, matchedBy: 'erpId' });
  });

  it('matches by barcode (CODE) when erpId absent locally', () => {
    const p = product({ id: 'a', sku: 'SKU1', barcode: 'BC1' });
    const plan = planLogoRowMatch(
      mapped({ erpId: '999', barcode: 'BC1', sku: 'SKU1', stockQuantity: 9 }),
      new Map(),
      new Map([['BC1', [p]]]),
      new Map([['SKU1', [p]]]),
      new Set(),
    );
    expect(plan).toEqual({
      action: 'update',
      product: p,
      matchedBy: 'barcode',
    });
  });

  it('falls back to sku when barcode missing locally', () => {
    const p = product({ id: 'a', sku: 'SKU1', barcode: '' });
    const plan = planLogoRowMatch(
      mapped({ erpId: '1', barcode: 'NEW-BC', sku: 'SKU1' }),
      new Map(),
      new Map(),
      new Map([['SKU1', [p]]]),
      new Set(),
    );
    expect(plan).toEqual({ action: 'update', product: p, matchedBy: 'sku' });
  });

  it('reports conflict when barcode and sku point to different products', () => {
    const a = product({ id: 'a', sku: 'SA', barcode: 'BC1' });
    const b = product({ id: 'b', sku: 'SB', barcode: 'BC2' });
    const plan = planLogoRowMatch(
      mapped({ erpId: '1', barcode: 'BC1', sku: 'SB' }),
      new Map(),
      new Map([['BC1', [a]]]),
      new Map([
        ['SA', [a]],
        ['SB', [b]],
      ]),
      new Set(),
    );
    expect(plan.action).toBe('conflict');
    if (plan.action === 'conflict') {
      expect(plan.conflict.type).toBe('barcode_sku_cross_match');
    }
  });

  it('reports conflict on sku fallback when existing barcode differs', () => {
    const p = product({ id: 'a', sku: 'SKU1', barcode: 'OLD-BC' });
    const plan = planLogoRowMatch(
      mapped({ erpId: '1', barcode: 'NEW-BC', sku: 'SKU1' }),
      new Map(),
      new Map([['OLD-BC', [p]]]),
      new Map([['SKU1', [p]]]),
      new Set(),
    );
    expect(plan.action).toBe('conflict');
    if (plan.action === 'conflict') {
      expect(plan.conflict.type).toBe('sku_fallback_barcode_mismatch');
    }
  });

  it('creates when neither erpId nor barcode nor sku matches', () => {
    const plan = planLogoRowMatch(
      mapped({ erpId: 'X', barcode: 'BC-X', sku: 'SKU-X' }),
      new Map(),
      new Map(),
      new Map(),
      new Set(),
    );
    expect(plan).toEqual({ action: 'create' });
  });

  it('creates when PRODUCERCODE/sku is empty but CODE and LOGICALREF present', () => {
    const plan = planLogoRowMatch(
      mapped({ erpId: '2', barcode: '0001', sku: '', name: 'TAHTA PALET' }),
      new Map(),
      new Map(),
      new Map(),
      new Set(),
    );
    expect(plan).toEqual({ action: 'create' });
  });

  it('updates by barcode when PRODUCERCODE/sku is empty (no missing_producer conflict)', () => {
    const p = product({ id: 'a', sku: '', barcode: '0001', erpId: undefined });
    const plan = planLogoRowMatch(
      mapped({ erpId: '2', barcode: '0001', sku: '', name: 'TAHTA PALET' }),
      new Map(),
      new Map([['0001', [p]]]),
      new Map(),
      new Set(),
    );
    expect(plan).toEqual({
      action: 'update',
      product: p,
      matchedBy: 'barcode',
    });
  });

  it('reports duplicate Logo barcode without deleting', () => {
    const seen = new Set(['BC1']);
    const plan = planLogoRowMatch(
      mapped({ erpId: '1', barcode: 'BC1', sku: 'S1' }),
      new Map(),
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
