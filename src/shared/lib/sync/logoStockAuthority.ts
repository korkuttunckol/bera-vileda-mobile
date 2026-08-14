/**
 * Logo MERKEZ is the authoritative stockQuantity source when stockSource === 'logo'.
 * Firestore PullSync must not overwrite those stock fields with remote values.
 */

import type { Product } from '@/shared/types/product.types';

export type ProductStockSource = 'logo' | 'excel' | 'firestore' | 'manual';

export interface LogoStockOverlay {
  stockQuantity: number;
  stockSource: 'logo';
  lastLogoSyncedAt?: string;
}

export function isLogoAuthoritativeStock(
  product: Pick<Product, 'stockSource'> | null | undefined,
): boolean {
  return product?.stockSource === 'logo';
}

/**
 * After ConflictResolver / remote normalize: keep local Logo stock fields.
 * Non-logo locals and brand-new remotes are unchanged.
 */
export function preserveLogoStockFields<T extends Product>(
  local: T | undefined,
  merged: T,
): T {
  if (!local || !isLogoAuthoritativeStock(local)) {
    return merged;
  }

  return {
    ...merged,
    stockQuantity: local.stockQuantity,
    stockSource: 'logo',
    lastLogoSyncedAt: local.lastLogoSyncedAt,
  };
}

function indexKeySku(sku: string): string {
  return sku.trim().toUpperCase();
}

function indexKeyBarcode(barcode: string): string {
  return barcode.trim();
}

/**
 * Snapshot Logo-managed stock from locals before a destructive full product replace.
 */
export function buildLogoStockOverlayIndex(
  locals: Product[],
): {
  byId: Map<string, LogoStockOverlay>;
  bySku: Map<string, LogoStockOverlay>;
  byBarcode: Map<string, LogoStockOverlay>;
} {
  const byId = new Map<string, LogoStockOverlay>();
  const bySku = new Map<string, LogoStockOverlay>();
  const byBarcode = new Map<string, LogoStockOverlay>();

  for (const local of locals) {
    if (!isLogoAuthoritativeStock(local)) continue;
    const overlay: LogoStockOverlay = {
      stockQuantity: local.stockQuantity,
      stockSource: 'logo',
      lastLogoSyncedAt: local.lastLogoSyncedAt,
    };
    byId.set(local.id, overlay);
    const sku = indexKeySku(local.sku);
    if (sku) bySku.set(sku, overlay);
    const barcode = indexKeyBarcode(local.barcode ?? '');
    if (barcode) byBarcode.set(barcode, overlay);
  }

  return { byId, bySku, byBarcode };
}

function findOverlay(
  product: Product,
  index: ReturnType<typeof buildLogoStockOverlayIndex>,
): LogoStockOverlay | undefined {
  const byId = index.byId.get(product.id);
  if (byId) return byId;
  const bySku = index.bySku.get(indexKeySku(product.sku));
  if (bySku) return bySku;
  const barcode = indexKeyBarcode(product.barcode ?? '');
  if (barcode) return index.byBarcode.get(barcode);
  return undefined;
}

/** Re-apply Logo stock overlays onto a remote (or merged) product list. */
export function applyLogoStockOverlays(
  products: Product[],
  index: ReturnType<typeof buildLogoStockOverlayIndex>,
): Product[] {
  if (
    index.byId.size === 0 &&
    index.bySku.size === 0 &&
    index.byBarcode.size === 0
  ) {
    return products;
  }

  return products.map((product) => {
    const overlay = findOverlay(product, index);
    if (!overlay) return product;
    return {
      ...product,
      stockQuantity: overlay.stockQuantity,
      stockSource: overlay.stockSource,
      lastLogoSyncedAt: overlay.lastLogoSyncedAt,
    };
  });
}
