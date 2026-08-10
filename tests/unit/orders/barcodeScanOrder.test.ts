import { describe, expect, it } from 'vitest';
import { BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import {
  parseScanQuantity,
  resolveScannedProduct,
} from '@/features/orders/utils/barcodeScanOrder';
import {
  barcodeLookupCandidates,
  NATIVE_ORDER_BARCODE_FORMATS,
  normalizeScannedBarcodeForLookup,
} from '@/shared/nativeBarcode/scanNativeBarcode';
import type { Product } from '@/shared/types/product.types';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    sku: 'SKU-1',
    name: 'Test Ürün',
    category: 'cat',
    unit: 'adet',
    barcode: '8690000000012',
    listPrice: 10,
    vatRate: 20,
    stockQuantity: 5,
    isActive: true,
    isDeleted: false,
    version: 1,
    syncStatus: 'synced',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'test',
    updatedBy: 'test',
    ...overrides,
  };
}

describe('native order barcode formats', () => {
  it('includes required retail formats', () => {
    expect(NATIVE_ORDER_BARCODE_FORMATS).toEqual([
      BarcodeFormat.Ean13,
      BarcodeFormat.Ean8,
      BarcodeFormat.UpcA,
      BarcodeFormat.UpcE,
      BarcodeFormat.Code128,
    ]);
  });
});

describe('barcodeLookupCandidates', () => {
  it('returns raw code and UPC-A → EAN-13 padded variant', () => {
    expect(barcodeLookupCandidates('123456789012')).toEqual([
      '123456789012',
      '0123456789012',
    ]);
  });

  it('returns EAN-13 and stripped UPC-A variant', () => {
    expect(barcodeLookupCandidates('0123456789012')).toEqual([
      '0123456789012',
      '123456789012',
    ]);
  });

  it('trims whitespace and dedupes', () => {
    expect(barcodeLookupCandidates(' 8690000000012 ')).toEqual([
      '8690000000012',
    ]);
  });
});

describe('normalizeScannedBarcodeForLookup', () => {
  it('pads 12-digit UPC-A with leading zero', () => {
    expect(normalizeScannedBarcodeForLookup('123456789012')).toBe(
      '0123456789012',
    );
  });

  it('leaves EAN-13 unchanged', () => {
    expect(normalizeScannedBarcodeForLookup('8690000000012')).toBe(
      '8690000000012',
    );
  });
});

describe('resolveScannedProduct', () => {
  it('returns not_found when product missing', () => {
    expect(resolveScannedProduct(undefined)).toEqual({ status: 'not_found' });
  });

  it('returns out_of_stock when stock <= 0', () => {
    const product = makeProduct({ stockQuantity: 0 });
    expect(resolveScannedProduct(product)).toEqual({
      status: 'out_of_stock',
      product,
    });
  });

  it('returns ready when stock > 0', () => {
    const product = makeProduct({ stockQuantity: 3 });
    expect(resolveScannedProduct(product)).toEqual({
      status: 'ready',
      product,
    });
  });
});

describe('parseScanQuantity', () => {
  it('parses positive integers', () => {
    expect(parseScanQuantity('10')).toBe(10);
    expect(parseScanQuantity(' 1 ')).toBe(1);
  });

  it('rejects invalid quantities', () => {
    expect(parseScanQuantity('')).toBeNull();
    expect(parseScanQuantity('0')).toBeNull();
    expect(parseScanQuantity('1.5')).toBeNull();
    expect(parseScanQuantity('abc')).toBeNull();
  });
});
