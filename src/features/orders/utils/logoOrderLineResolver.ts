/**
 * Resolve an OrderLine against the current Product catalog for Logo export.
 *
 * Match priority (stable → mutable):
 *   1. line.erpId     → Product.erpId  (Logo LOGICALREF)
 *   2. line.productSku → Product.sku   (PRODUCERCODE)
 *   3. line.barcodeAtOrder → Product.barcode (CODE)
 *
 * On success, export uses the **current** Product.barcode / sku / erpId.
 * OrderLine snapshot fields are never mutated.
 * Product catalog is never mutated.
 *
 * Wire-up (Stage 2C — resolve only; do not change send paths yet):
 *   - `orderReportBuilder.enrichLines` / Logo Wings Excel barcode column
 *   - future Logo order export before writing CODE to transfer file
 *   - not OutboxProcessor / PushSync / PullSync (out of scope here)
 */

import type { OrderLine } from '@/shared/types/order.types';
import type { Product } from '@/shared/types/product.types';

export type LogoOrderLineMatchStatus = 'matched' | 'matching_pending';

export type LogoOrderLineMatchBy = 'erpId' | 'sku' | 'barcode';

export interface LogoOrderLineResolved {
  status: 'matched';
  matchedBy: LogoOrderLineMatchBy;
  /** Current Product.barcode (CODE) — use for Logo send; not barcodeAtOrder */
  barcode: string;
  /** Current Product.sku (PRODUCERCODE) */
  sku: string;
  /** Current Product.erpId (LOGICALREF) */
  erpId?: string;
  /** Quantity copied from OrderLine — never altered */
  quantity: number;
  productId: string;
  /** Live product reference (read-only); caller must not mutate for this resolver */
  product: Product;
}

export interface LogoOrderLinePending {
  status: 'matching_pending';
  quantity: number;
  lineId: string;
  orderId: string;
  reason: string;
}

export type LogoOrderLineResolveResult =
  | LogoOrderLineResolved
  | LogoOrderLinePending;

export interface LogoProductCatalogIndex {
  byErpId: Map<string, Product>;
  bySku: Map<string, Product>;
  byBarcode: Map<string, Product>;
}

function normKey(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function normSku(value: string | undefined | null): string {
  return normKey(value).toUpperCase();
}

/**
 * Build lookup maps from an in-memory product list.
 * Skips deleted products. Does not mutate the input array or products.
 */
export function buildLogoProductCatalogIndex(
  products: readonly Product[],
): LogoProductCatalogIndex {
  const byErpId = new Map<string, Product>();
  const bySku = new Map<string, Product>();
  const byBarcode = new Map<string, Product>();

  for (const product of products) {
    if (product.isDeleted) continue;

    const erpId = normKey(product.erpId);
    if (erpId && !byErpId.has(erpId)) {
      byErpId.set(erpId, product);
    }

    const sku = normSku(product.sku);
    if (sku && !bySku.has(sku)) {
      bySku.set(sku, product);
    }

    const barcode = normKey(product.barcode);
    if (barcode && !byBarcode.has(barcode)) {
      byBarcode.set(barcode, product);
    }
  }

  return { byErpId, bySku, byBarcode };
}

function toMatched(
  product: Product,
  matchedBy: LogoOrderLineMatchBy,
  quantity: number,
): LogoOrderLineResolved {
  return {
    status: 'matched',
    matchedBy,
    barcode: normKey(product.barcode),
    sku: product.sku,
    erpId: normKey(product.erpId) || undefined,
    quantity,
    productId: product.id,
    product,
  };
}

/**
 * Resolve one order line against the catalog index.
 * Pure: does not write OrderLine, Product, outbox, or IndexedDB.
 */
export function resolveLogoOrderLine(
  line: OrderLine,
  catalog: LogoProductCatalogIndex,
): LogoOrderLineResolveResult {
  const quantity = line.quantity;

  const erpId = normKey(line.erpId);
  if (erpId) {
    const byErp = catalog.byErpId.get(erpId);
    if (byErp) {
      return toMatched(byErp, 'erpId', quantity);
    }
  }

  const sku = normSku(line.productSku);
  if (sku) {
    const bySku = catalog.bySku.get(sku);
    if (bySku) {
      return toMatched(bySku, 'sku', quantity);
    }
  }

  const barcodeAtOrder = normKey(line.barcodeAtOrder);
  if (barcodeAtOrder) {
    const byBarcode = catalog.byBarcode.get(barcodeAtOrder);
    if (byBarcode) {
      return toMatched(byBarcode, 'barcode', quantity);
    }
  }

  return {
    status: 'matching_pending',
    quantity,
    lineId: line.id,
    orderId: line.orderId,
    reason:
      'Sipariş satırı Logo ürün kartı ile eşleştirilemedi (LOGICALREF / sku / barkod).',
  };
}

/**
 * Resolve many lines. Catalog and lines are not mutated.
 */
export function resolveLogoOrderLines(
  lines: readonly OrderLine[],
  products: readonly Product[],
): LogoOrderLineResolveResult[] {
  const catalog = buildLogoProductCatalogIndex(products);
  return lines.map((line) => resolveLogoOrderLine(line, catalog));
}
