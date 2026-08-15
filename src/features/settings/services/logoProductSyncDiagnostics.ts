/**
 * Stage 3C-4 diagnostics for Logo product/stock sync UI.
 * Does not mutate data. Sync logic stays in logoProductSyncService.
 */

import { db } from '@/shared/lib/indexeddb/db';
import type { LocalProduct } from '@/shared/lib/indexeddb/db';

/** Side-effect safety counters — must be unchanged by Logo product sync. */
export interface LogoProductSyncSafetyCounts {
  branches: number;
  orders: number;
  orderLines: number;
  outbox: number;
}

export interface LogoProductSample {
  id: string;
  barcode?: string;
  sku: string;
  name: string;
  erpId?: string;
  stockQuantity: number;
}

export interface LogoProductSamplesDiagnostic {
  countWithErpId: number;
  totalActive: number;
  samples: LogoProductSample[];
}

export async function snapshotLogoProductSyncSafetyCounts(): Promise<LogoProductSyncSafetyCounts> {
  const [branches, orders, orderLines, outbox] = await Promise.all([
    db.branches.count(),
    db.orders.count(),
    db.orderLines.count(),
    db.syncQueue.count(),
  ]);
  return { branches, orders, orderLines, outbox };
}

export function productSafetyCountsUnchanged(
  before: LogoProductSyncSafetyCounts,
  after: LogoProductSyncSafetyCounts,
): boolean {
  return (
    before.branches === after.branches &&
    before.orders === after.orders &&
    before.orderLines === after.orderLines &&
    before.outbox === after.outbox
  );
}

/** Pure sample builder — LAN verification that erpId = Logo LOGICALREF. */
export function buildLogoProductSamplesDiagnostic(
  products: LocalProduct[],
  sampleLimit = 8,
): LogoProductSamplesDiagnostic {
  const active = products.filter((p) => !p.isDeleted);
  const withErp = active.filter((p) => (p.erpId ?? '').trim().length > 0);

  return {
    countWithErpId: withErp.length,
    totalActive: active.length,
    samples: withErp.slice(0, sampleLimit).map((p) => ({
      id: p.id,
      barcode: p.barcode,
      sku: p.sku,
      name: p.name,
      erpId: p.erpId,
      stockQuantity: p.stockQuantity,
    })),
  };
}

export async function loadLogoProductSamplesDiagnostic(
  sampleLimit = 8,
): Promise<LogoProductSamplesDiagnostic> {
  const products = await db.products.toArray();
  return buildLogoProductSamplesDiagnostic(products, sampleLimit);
}
