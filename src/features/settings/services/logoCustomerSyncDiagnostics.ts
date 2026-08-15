/**
 * Stage 3C-3 diagnostics for Logo customer sync UI.
 * Does not mutate data. Sync logic stays in logoCustomerSyncService.
 */

import { db } from '@/shared/lib/indexeddb/db';
import type { LocalCustomer } from '@/shared/lib/indexeddb/db';

/** Side-effect safety counters — must be unchanged by Logo customer sync. */
export interface LogoCustomerSyncSafetyCounts {
  branches: number;
  orders: number;
  orderLines: number;
  outbox: number;
}

export interface LogoSalesRepSample {
  id: string;
  code: string;
  name: string;
  erpId?: string;
  logoSalesRepCode?: string;
}

export interface LogoSalesRepDiagnostic {
  logoSalesRepCode: string;
  count: number;
  /** First samples for on-screen verification (e.g. SPECODE 2217). */
  samples: LogoSalesRepSample[];
}

export async function snapshotLogoCustomerSyncSafetyCounts(): Promise<LogoCustomerSyncSafetyCounts> {
  const [branches, orders, orderLines, outbox] = await Promise.all([
    db.branches.count(),
    db.orders.count(),
    db.orderLines.count(),
    db.syncQueue.count(),
  ]);
  return { branches, orders, orderLines, outbox };
}

export function safetyCountsUnchanged(
  before: LogoCustomerSyncSafetyCounts,
  after: LogoCustomerSyncSafetyCounts,
): boolean {
  return (
    before.branches === after.branches &&
    before.orders === after.orders &&
    before.orderLines === after.orderLines &&
    before.outbox === after.outbox
  );
}

/**
 * Count local customers with a given Logo SPECODE (logoSalesRepCode).
 * Pure over an in-memory list — used by UI and unit tests.
 */
export function buildLogoSalesRepDiagnostic(
  customers: LocalCustomer[],
  logoSalesRepCode: string,
  sampleLimit = 8,
): LogoSalesRepDiagnostic {
  const code = logoSalesRepCode.trim();
  const matched = customers.filter(
    (c) =>
      !c.isDeleted &&
      (c.logoSalesRepCode ?? '').trim() === code,
  );

  return {
    logoSalesRepCode: code,
    count: matched.length,
    samples: matched.slice(0, sampleLimit).map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      erpId: c.erpId,
      logoSalesRepCode: c.logoSalesRepCode,
    })),
  };
}

export async function loadLogoSalesRepDiagnostic(
  logoSalesRepCode: string,
  sampleLimit = 8,
): Promise<LogoSalesRepDiagnostic> {
  const customers = await db.customers.toArray();
  return buildLogoSalesRepDiagnostic(customers, logoSalesRepCode, sampleLimit);
}

/** Default LAN verification code from Logo CLCARD.SPECODE. */
export const LOGO_LAN_TEST_SALES_REP_CODE = '2217';
