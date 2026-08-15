import type { Product } from '@/shared/types/product.types';

export type ScannedProductResolve =
  | { status: 'ready'; product: Product }
  | { status: 'not_found' };

/**
 * Resolve a scanned barcode hit.
 * Stock is informational only — zero/negative stock does not block ordering.
 */
export function resolveScannedProduct(
  product: Product | undefined,
): ScannedProductResolve {
  if (!product) return { status: 'not_found' };
  return { status: 'ready', product };
}

export function parseScanQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const qty = Number(trimmed);
  if (!Number.isInteger(qty) || qty < 1) return null;
  return qty;
}
