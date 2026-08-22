/**
 * Order line product snapshot helpers.
 * Catalog (Logo/Excel/PullSync) changes must not rewrite these fields after create.
 */

import type { OrderDraftLine } from '@/features/orders/types/orderFlow.types';
import type { OrderLine } from '@/shared/types/order.types';

export interface OrderLineSnapshotInput {
  orderId: string;
  lineId: string;
  sortOrder: number;
  draft: OrderDraftLine;
}

/**
 * Build a permanent OrderLine from draft snapshot fields.
 * Does not read live Product — only draft values at save time.
 */
export function buildOrderLineFromDraft(
  input: OrderLineSnapshotInput,
): OrderLine {
  const { draft } = input;
  const name = draft.productName;
  const barcode = draft.productBarcode?.trim() || undefined;
  const erpId = draft.productErpId?.trim() || undefined;

  return {
    id: input.lineId,
    orderId: input.orderId,
    productId: draft.productId,
    productSku: draft.productSku,
    productName: name,
    productNameAtOrder: name,
    barcodeAtOrder: barcode,
    erpId,
    quantity: draft.quantity,
    unitPrice: draft.unitPrice,
    discountRate: draft.discountRate,
    vatRate: draft.vatRate,
    lineTotal: draft.lineTotal,
    sortOrder: input.sortOrder,
    unit: draft.unit,
  };
}

/** Display name: explicit snapshot, else legacy productName. */
export function resolveOrderLineDisplayName(line: OrderLine): string {
  const snapshot = line.productNameAtOrder?.trim();
  if (snapshot) return snapshot;
  return line.productName;
}

/**
 * Barcode for history/detail: snapshot first; optional live fallback for legacy rows.
 */
export function resolveOrderLineBarcode(
  line: OrderLine,
  liveBarcode?: string | null,
): string | undefined {
  const snapshot = line.barcodeAtOrder?.trim();
  if (snapshot) return snapshot;
  const live = liveBarcode?.trim();
  return live || undefined;
}
