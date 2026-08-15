import { describe, expect, it } from 'vitest';
import {
  applyLogoFieldsToProduct,
  logoFieldsForNewProduct,
  mapLogoRowToProductFields,
} from '@/features/settings/services/logoProductMapper';
import type { Product } from '@/shared/types/product.types';

describe('logoProductMapper', () => {
  it('maps LOGICALREF → erpId', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: 42001,
      CODE: '8690001',
      PRODUCERCODE: 'SKU1',
      NAME: 'Bez',
    });
    expect(mapped?.erpId).toBe('42001');
  });

  it('maps CODE → barcode', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '1',
      CODE: '  8690001  ',
      PRODUCERCODE: 'SKU1',
      NAME: 'Bez',
    });
    expect(mapped?.barcode).toBe('8690001');
  });

  it('maps PRODUCERCODE → sku', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '1',
      CODE: 'B1',
      PRODUCERCODE: 'sku-aa',
      NAME: 'Bez',
    });
    expect(mapped?.sku).toBe('SKU-AA');
  });

  it('maps NAME → name', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '1',
      CODE: 'B1',
      PRODUCERCODE: 'S1',
      NAME: 'Vileda Bez',
    });
    expect(mapped?.name).toBe('Vileda Bez');
  });

  it('maps STGRPCODE → groupCode (not category)', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '1',
      CODE: 'B1',
      PRODUCERCODE: 'S1',
      NAME: 'N',
      STGRPCODE: 'VILEDA',
    });
    expect(mapped?.groupCode).toBe('VILEDA');
  });

  it('maps SPECODE → specialCode', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '1',
      CODE: 'B1',
      PRODUCERCODE: 'S1',
      NAME: 'N',
      SPECODE: 'SP1',
    });
    expect(mapped?.specialCode).toBe('SP1');
  });

  it('maps SPECODE2 → specialCode2', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '1',
      CODE: 'B1',
      PRODUCERCODE: 'S1',
      NAME: 'N',
      SPECODE2: 'SP2',
    });
    expect(mapped?.specialCode2).toBe('SP2');
  });

  it('maps VAT → vatRate', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '1',
      CODE: 'B1',
      PRODUCERCODE: 'S1',
      NAME: 'N',
      VAT: '20',
    });
    expect(mapped?.vatRate).toBe(20);
  });

  it('maps MERKEZ → stockQuantity', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '1',
      CODE: 'B1',
      PRODUCERCODE: 'S1',
      NAME: 'N',
      MERKEZ: '15',
    });
    expect(mapped?.stockQuantity).toBe(15);
  });

  it('maps SATIS_FIYATI → listPrice', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '1',
      CODE: 'B1',
      PRODUCERCODE: 'S1',
      NAME: 'N',
      SATIS_FIYATI: '99,5',
    });
    expect(mapped?.listPrice).toBe(99.5);
  });

  it('returns null when LOGICALREF or CODE missing', () => {
    expect(
      mapLogoRowToProductFields({
        CODE: 'B1',
        PRODUCERCODE: 'S1',
        NAME: 'N',
      }),
    ).toBeNull();
    expect(
      mapLogoRowToProductFields({
        LOGICALREF: '1',
        PRODUCERCODE: 'S1',
        NAME: 'N',
      }),
    ).toBeNull();
  });

  it('does not put PRODUCERCODE into barcode or CODE into sku', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '9',
      CODE: 'BAR-1',
      PRODUCERCODE: 'PROD-1',
      NAME: 'Item',
      MERKEZ: 3,
      SATIS_FIYATI: 10,
    });
    expect(mapped?.barcode).toBe('BAR-1');
    expect(mapped?.sku).toBe('PROD-1');
    expect(mapped?.erpId).toBe('9');
  });

  it('preserves category and writes erpId on apply/create', () => {
    const mapped = mapLogoRowToProductFields({
      LOGICALREF: '55',
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
    expect(updated.erpId).toBe('55');

    const createdFields = logoFieldsForNewProduct(mapped);
    expect(createdFields.category).toBe('Genel');
    expect(createdFields.erpId).toBe('55');
  });
});
