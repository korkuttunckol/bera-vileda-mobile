import { describe, expect, it, vi } from 'vitest';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import {
  ZXING_PRODUCT_FORMAT_NAMES,
  isConfiguredZxingFormatName,
  normalizeScannedBarcodeForLookup,
} from '@/features/orders/utils/barcodeZxingConfig';
import {
  parseScanQuantity,
  resolveScannedProduct,
  shouldAcceptScanEvent,
} from '@/features/orders/utils/barcodeScanOrder';
import type { Product } from '@/shared/types/product.types';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    sku: '137657',
    name: 'Test Ürün',
    category: 'cat',
    unit: 'Adet',
    barcode: '8690123456788',
    listPrice: 10,
    vatRate: 20,
    isActive: true,
    stockQuantity: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'MERCH01',
    updatedBy: 'MERCH01',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

describe('ZXing product barcode formats', () => {
  it('includes EAN-13 for retail product barcodes', () => {
    expect(isConfiguredZxingFormatName('EAN_13')).toBe(true);
    expect(ZXING_PRODUCT_FORMAT_NAMES).toContain('EAN_13');
  });

  it('includes EAN-8', () => {
    expect(ZXING_PRODUCT_FORMAT_NAMES).toContain('EAN_8');
  });

  it('includes UPC-A', () => {
    expect(ZXING_PRODUCT_FORMAT_NAMES).toContain('UPC_A');
  });

  it('includes UPC-E', () => {
    expect(ZXING_PRODUCT_FORMAT_NAMES).toContain('UPC_E');
  });

  it('includes CODE-128', () => {
    expect(ZXING_PRODUCT_FORMAT_NAMES).toContain('CODE_128');
  });

  it('maps configured names to ZXing BarcodeFormat enums used by the reader', () => {
    const mapped = ZXING_PRODUCT_FORMAT_NAMES.map((name) => {
      switch (name) {
        case 'EAN_13':
          return BarcodeFormat.EAN_13;
        case 'EAN_8':
          return BarcodeFormat.EAN_8;
        case 'UPC_A':
          return BarcodeFormat.UPC_A;
        case 'UPC_E':
          return BarcodeFormat.UPC_E;
        case 'CODE_128':
          return BarcodeFormat.CODE_128;
        default: {
          const _exhaustive: never = name;
          return _exhaustive;
        }
      }
    });

    expect(mapped).toEqual([
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, mapped);
    hints.set(DecodeHintType.TRY_HARDER, true);
    expect(hints.get(DecodeHintType.POSSIBLE_FORMATS)).toHaveLength(5);
  });
});

describe('normalizeScannedBarcodeForLookup', () => {
  it('keeps EAN-13 decode text for Product.barcode lookup', () => {
    expect(normalizeScannedBarcodeForLookup('8690123456788')).toBe(
      '8690123456788',
    );
  });

  it('keeps EAN-8 decode text', () => {
    expect(normalizeScannedBarcodeForLookup('96385074')).toBe('96385074');
  });

  it('normalizes UPC-A 12-digit to EAN-13 style for lookup', () => {
    expect(normalizeScannedBarcodeForLookup('012345678905')).toBe(
      '0012345678905',
    );
  });

  it('keeps CODE-128 alphanumeric payload', () => {
    expect(normalizeScannedBarcodeForLookup('ABC-12345')).toBe('ABC-12345');
  });

  it('sends normalized decode value to Product.barcode lookup', async () => {
    const findByBarcode = vi.fn(async (code: string) =>
      makeProduct({ barcode: code }),
    );
    const decoded = normalizeScannedBarcodeForLookup('8690123456788');
    const product = await findByBarcode(decoded);
    expect(findByBarcode).toHaveBeenCalledWith('8690123456788');
    expect(resolveScannedProduct(product).status).toBe('ready');
  });
});

describe('barcodeScanOrder guards', () => {
  it('blocks stock 0', () => {
    expect(
      resolveScannedProduct(makeProduct({ stockQuantity: 0 })).status,
    ).toBe('out_of_stock');
  });

  it('suppresses duplicate scanner events', () => {
    expect(
      shouldAcceptScanEvent({
        barcode: '8690123456788',
        now: 1_200,
        lastBarcode: '8690123456788',
        lastAcceptedAt: 1_000,
        cooldownMs: 1_500,
      }),
    ).toBe(false);
  });

  it('requires confirm qty before cart add', () => {
    expect(parseScanQuantity('')).toBeNull();
    expect(parseScanQuantity('5')).toBe(5);
  });
});

describe('addToCart accumulation for rescanned product', () => {
  it('adds quantities when same product is scanned twice', async () => {
    const { useOrderDraftStore } = await import('@/stores/orderDraftStore');
    useOrderDraftStore.getState().reset();
    const product = makeProduct({ id: 'scan-p1' });

    useOrderDraftStore.getState().addToCart(product, 10);
    useOrderDraftStore.getState().addToCart(product, 3);

    const line = useOrderDraftStore
      .getState()
      .lines.find((l) => l.productId === product.id);
    expect(line?.quantity).toBe(13);
  });
});
