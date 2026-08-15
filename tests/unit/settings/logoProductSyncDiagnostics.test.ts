import { describe, expect, it } from 'vitest';
import {
  buildLogoProductSamplesDiagnostic,
  productSafetyCountsUnchanged,
} from '@/features/settings/services/logoProductSyncDiagnostics';
import type { LocalProduct } from '@/shared/lib/indexeddb/db';

function product(
  overrides: Partial<LocalProduct> & Pick<LocalProduct, 'id' | 'sku'>,
): LocalProduct {
  return {
    localId: overrides.id,
    barcode: overrides.barcode ?? 'B',
    name: overrides.name ?? 'N',
    category: 'Genel',
    unit: 'Adet',
    listPrice: 1,
    vatRate: 20,
    stockQuantity: overrides.stockQuantity ?? 0,
    isActive: true,
    isDeleted: false,
    createdAt: 't',
    updatedAt: 't',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'pending',
    ...overrides,
  };
}

describe('logoProductSyncDiagnostics', () => {
  it('detects unchanged safety counts', () => {
    const a = { branches: 1, orders: 2, orderLines: 3, outbox: 0 };
    expect(productSafetyCountsUnchanged(a, { ...a })).toBe(true);
    expect(productSafetyCountsUnchanged(a, { ...a, orders: 9 })).toBe(false);
  });

  it('samples products that have erpId (Logo LOGICALREF)', () => {
    const diag = buildLogoProductSamplesDiagnostic(
      [
        product({
          id: '1',
          sku: 'S1',
          barcode: 'B1',
          erpId: '1001',
          stockQuantity: 7,
          name: 'One',
        }),
        product({ id: '2', sku: 'S2', barcode: 'B2', name: 'No erp' }),
        product({
          id: '3',
          sku: 'S3',
          barcode: 'B3',
          erpId: '1002',
          isDeleted: true,
        }),
      ],
      5,
    );

    expect(diag.totalActive).toBe(2);
    expect(diag.countWithErpId).toBe(1);
    expect(diag.samples).toHaveLength(1);
    expect(diag.samples[0].erpId).toBe('1001');
    expect(diag.samples[0].barcode).toBe('B1');
    expect(diag.samples[0].stockQuantity).toBe(7);
  });
});
