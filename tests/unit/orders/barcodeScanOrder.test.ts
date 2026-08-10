import { describe, expect, it } from 'vitest';
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
    barcode: '8691234567890',
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

describe('barcodeScanOrder', () => {
  it('resolves found product by barcode lookup result', () => {
    const product = makeProduct();
    expect(resolveScannedProduct(product)).toEqual({
      status: 'ready',
      product,
    });
  });

  it('returns not_found when product is missing', () => {
    expect(resolveScannedProduct(undefined)).toEqual({ status: 'not_found' });
  });

  it('blocks out-of-stock products (stock <= 0)', () => {
    const product = makeProduct({ stockQuantity: 0 });
    expect(resolveScannedProduct(product)).toEqual({
      status: 'out_of_stock',
      product,
    });
  });

  it('parses valid manual quantity for cart add', () => {
    expect(parseScanQuantity('12')).toBe(12);
    expect(parseScanQuantity('0')).toBeNull();
    expect(parseScanQuantity('')).toBeNull();
    expect(parseScanQuantity('1.5')).toBeNull();
  });

  it('does not treat detect as cart add — confirm qty is separate', () => {
    // Detection only resolves product readiness; cart write requires parseScanQuantity.
    const ready = resolveScannedProduct(makeProduct());
    expect(ready.status).toBe('ready');
    expect(parseScanQuantity('')).toBeNull();
  });

  it('suppresses duplicate scanner events within cooldown', () => {
    const first = shouldAcceptScanEvent({
      barcode: '8691234567890',
      now: 1_000,
      lastBarcode: null,
      lastAcceptedAt: 0,
      cooldownMs: 1_500,
    });
    expect(first).toBe(true);

    const duplicate = shouldAcceptScanEvent({
      barcode: '8691234567890',
      now: 1_200,
      lastBarcode: '8691234567890',
      lastAcceptedAt: 1_000,
      cooldownMs: 1_500,
    });
    expect(duplicate).toBe(false);

    const afterCooldown = shouldAcceptScanEvent({
      barcode: '8691234567890',
      now: 3_000,
      lastBarcode: '8691234567890',
      lastAcceptedAt: 1_000,
      cooldownMs: 1_500,
    });
    expect(afterCooldown).toBe(true);
  });
});

describe('addToCart accumulation for rescanned product', () => {
  it('adds quantities when same product is added twice via addToCart', async () => {
    const { useOrderDraftStore } = await import('@/stores/orderDraftStore');
    useOrderDraftStore.getState().reset();
    const product = makeProduct({ id: 'scan-p1', barcode: '111' });

    useOrderDraftStore.getState().addToCart(product, 10);
    useOrderDraftStore.getState().addToCart(product, 3);

    const line = useOrderDraftStore
      .getState()
      .lines.find((l) => l.productId === product.id);
    expect(line?.quantity).toBe(13);
  });
});
