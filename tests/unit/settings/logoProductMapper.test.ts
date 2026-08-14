import { describe, expect, it } from 'vitest';
import {
  applyLogoFieldsToProduct,
  logoFieldsForNewProduct,
  mapLogoRowToProductFields,
} from '@/features/settings/services/logoProductMapper';
import type { Product } from '@/shared/types/product.types';

describe('logoProductMapper', () => {
  it('maps Logo fields with locked CODE/PRODUCERCODE meanings', () => {
    const mapped = mapLogoRowToProductFields({
      CODE: '8690001',
      PRODUCERCODE: 'sku-aa',
      NAME: 'Bez',
      STGRPCODE: 'VILEDA',
      SPECODE: 'S1',
      SPECODE2: 'S2',
      VAT: '20',
      MERKEZ: '15',
      SATIS_FIYATI: '99,5',
    });

    expect(mapped).toEqual({
      barcode: '8690001',
      sku: 'SKU-AA',
      name: 'Bez',
      groupCode: 'VILEDA',
      specialCode: 'S1',
      specialCode2: 'S2',
      vatRate: 20,
      stockQuantity: 15,
      listPrice: 99.5,
    });
  });

  it('returns null when CODE (barcode) is missing', () => {
    expect(
      mapLogoRowToProductFields({
        PRODUCERCODE: 'X1',
        NAME: 'No barcode',
      }),
    ).toBeNull();
  });

  it('does not put PRODUCERCODE into barcode or CODE into sku', () => {
    const mapped = mapLogoRowToProductFields({
      CODE: 'BAR-1',
      PRODUCERCODE: 'PROD-1',
      NAME: 'Item',
      MERKEZ: 3,
      SATIS_FIYATI: 10,
    });
    expect(mapped?.barcode).toBe('BAR-1');
    expect(mapped?.sku).toBe('PROD-1');
    expect(mapped?.barcode).not.toBe(mapped?.sku);
  });

  it('never copies STGRPCODE into category on apply/create', () => {
    const mapped = mapLogoRowToProductFields({
      CODE: 'B1',
      PRODUCERCODE: 'P1',
      NAME: 'N',
      STGRPCODE: 'MARKA',
      MERKEZ: 1,
      SATIS_FIYATI: 2,
    })!;

    const existing = {
      id: '1',
      sku: 'OLD',
      barcode: 'B1',
      name: 'Old',
      category: 'ExcelKategori',
      unit: 'Adet',
      listPrice: 1,
      vatRate: 20,
      stockQuantity: 0,
      isActive: true,
      createdAt: 'a',
      updatedAt: 'a',
      createdBy: 'u',
      updatedBy: 'u',
      version: 1,
      syncStatus: 'synced',
    } as Product;

    const updated = applyLogoFieldsToProduct(existing, mapped, 'now');
    expect(updated.category).toBe('ExcelKategori');
    expect(updated.groupCode).toBe('MARKA');

    const createdFields = logoFieldsForNewProduct(mapped);
    expect(createdFields.category).toBe('Genel');
    expect(createdFields.groupCode).toBe('MARKA');
    expect(createdFields.stockQuantity).toBe(1);
  });
});
