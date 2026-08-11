import { isProductOutOfStock } from '@/features/orders/utils/stockControl';
import type { Product } from '@/shared/types/product.types';

export type ScannedBarcodeResolveResult =
  | { status: 'not_found' }
  | { status: 'out_of_stock'; product: Product }
  | { status: 'ready'; product: Product };

export const SCAN_COOLDOWN_MS = 1_500;

/** Map a product lookup result to scan-flow decision (no cart mutation). */
export function resolveScannedProduct(
  product: Product | undefined,
): ScannedBarcodeResolveResult {
  if (!product) {
    return { status: 'not_found' };
  }
  if (isProductOutOfStock(product)) {
    return { status: 'out_of_stock', product };
  }
  return { status: 'ready', product };
}

/**
 * Suppress duplicate detector events for the same barcode while scanning.
 * Confirmation UI must still gate cart writes separately.
 */
export function shouldAcceptScanEvent(options: {
  barcode: string;
  now: number;
  lastBarcode: string | null;
  lastAcceptedAt: number;
  cooldownMs?: number;
}): boolean {
  const code = options.barcode.trim();
  if (!code) return false;
  const cooldown = options.cooldownMs ?? SCAN_COOLDOWN_MS;
  if (
    options.lastBarcode === code &&
    options.now - options.lastAcceptedAt < cooldown
  ) {
    return false;
  }
  return true;
}

/** Validate manual qty before calling addToCart. Does not mutate cart. */
export function parseScanQuantity(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}
