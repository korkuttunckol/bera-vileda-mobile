/**
 * Maps a BERA Order + lines → Logo ORFICHE / ORFLINE DTOs.
 *
 * Uses logoOrderLineResolver (erpId → sku → barcodeAtOrder).
 * Does not mutate Order / OrderLine / Product / Customer.
 * Does not INSERT into SQL Server (Stage 3A — map only).
 *
 * ORFICHE:
 *   TRCODE=1, CLIENTREF=Customer.erpId, SOURCEINDEX=0,
 *   SPECODE=branchName, GENEXP1=branchName
 *
 * ORFLINE:
 *   STOCKREF=Product.erpId, AMOUNT=quantity, PRICE=unitPrice,
 *   TOTAL=qty×price, SHIPPEDAMOUNT=0, UOMREF=24, USREF=7,
 *   LINETYPE=0, SOURCEINDEX=0, TRCODE=1
 */

import type { Customer } from '@/shared/types/customer.types';
import type { Order, OrderLine } from '@/shared/types/order.types';
import type { Product } from '@/shared/types/product.types';
import {
  buildLogoProductCatalogIndex,
  resolveLogoOrderLine,
} from '@/features/orders/utils/logoOrderLineResolver';
import type {
  LogoOrficheDto,
  LogoOrflineDto,
  LogoOrderExportPendingDetail,
  LogoOrderExportResult,
} from '@/features/orders/utils/logoOrderExport.types';

export interface LogoOrderExportMapperInput {
  order: Order;
  lines: readonly OrderLine[];
  customers: readonly Customer[];
  products: readonly Product[];
  /**
   * Provisional ORFICHE.LOGICALREF for ORDFICHEREF linking.
   * Real value comes from Logo after insert; default 0.
   */
  provisionalOrficheLogicalRef?: number;
}

function norm(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function parseLogicalRef(value: string | undefined | null): number | undefined {
  const raw = norm(value);
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.trunc(n);
}

function findCustomer(
  order: Order,
  customers: readonly Customer[],
): Customer | undefined {
  return customers.find((c) => c.id === order.customerId && !c.isDeleted);
}

/**
 * Pure mapper: BERA order → Logo fiche/line DTOs or matching_pending.
 */
export function mapOrderToLogoExport(
  input: LogoOrderExportMapperInput,
): LogoOrderExportResult {
  const {
    order,
    lines,
    customers,
    products,
    provisionalOrficheLogicalRef = 0,
  } = input;

  const pending: LogoOrderExportPendingDetail[] = [];

  const customer = findCustomer(order, customers);
  if (!customer) {
    pending.push({
      reason: 'customer_not_found',
      message: `Cari bulunamadı (customerId=${order.customerId}).`,
    });
    return { status: 'matching_pending', details: pending };
  }

  const clientRef = parseLogicalRef(customer.erpId);
  if (clientRef === undefined) {
    pending.push({
      reason: 'customer_erpId_missing',
      message: `Cari Logo LOGICALREF (erpId) yok (code=${customer.code}).`,
    });
    return { status: 'matching_pending', details: pending };
  }

  const branchName = norm(order.branchName);
  const catalog = buildLogoProductCatalogIndex(products);
  const orflines: LogoOrflineDto[] = [];

  const sortedLines = [...lines].sort((a, b) => a.sortOrder - b.sortOrder);

  for (let i = 0; i < sortedLines.length; i++) {
    const line = sortedLines[i]!;
    const resolved = resolveLogoOrderLine(line, catalog);

    if (resolved.status === 'matching_pending') {
      pending.push({
        reason: 'line_matching_pending',
        message: resolved.reason,
        lineId: line.id,
      });
      continue;
    }

    const stockRef = parseLogicalRef(resolved.erpId);
    if (stockRef === undefined) {
      pending.push({
        reason: 'product_erpId_missing',
        message: `Ürün Logo LOGICALREF (erpId) yok (sku=${resolved.sku}).`,
        lineId: line.id,
        productId: resolved.productId,
      });
      continue;
    }

    const amount = line.quantity;
    const price = line.unitPrice;
    orflines.push({
      LOGICALREF: 0,
      ORDFICHEREF: provisionalOrficheLogicalRef,
      LINENO_: i + 1,
      STOCKREF: stockRef,
      CLIENTREF: clientRef,
      AMOUNT: amount,
      PRICE: price,
      TOTAL: amount * price,
      SHIPPEDAMOUNT: 0,
      UOMREF: 24,
      USREF: 7,
      LINETYPE: 0,
      SOURCEINDEX: 0,
      TRCODE: 1,
      currentBarcode: resolved.barcode,
      currentSku: resolved.sku,
      beraLineId: line.id,
    });
  }

  if (pending.length > 0) {
    return { status: 'matching_pending', details: pending };
  }

  if (orflines.length === 0) {
    pending.push({
      reason: 'line_matching_pending',
      message: 'Siparişte map edilecek satır yok.',
    });
    return { status: 'matching_pending', details: pending };
  }

  const orfiche: LogoOrficheDto = {
    LOGICALREF: provisionalOrficheLogicalRef,
    TRCODE: 1,
    CLIENTREF: clientRef,
    SOURCEINDEX: 0,
    SPECODE: branchName,
    GENEXP1: branchName,
    CUSTORDNO: order.localOrderNumber ?? order.orderNumber,
    orderDateIso: order.orderDate,
  };

  return { status: 'mapped', orfiche, orflines };
}
