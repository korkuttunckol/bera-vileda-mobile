import type { Product } from '@/shared/types/product.types';

export type ScannedProductResolve =
  | { status: 'ready'; product: Product }
  | { status: 'not_found' }
  | { status: 'out_of_stock'; product: Product };

export function resolveScannedProduct(
  product: Product | undefined,
): ScannedProductResolve {
  if (!product) return { status: 'not_found' };
  if (product.stockQuantity <= 0) {
    return { status: 'out_of_stock', product };
  }
  return { status: 'ready', product };
}

export function parseScanQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const qty = Number(trimmed);
  if (!Number.isInteger(qty) || qty < 1) return null;
  return qty;
}
