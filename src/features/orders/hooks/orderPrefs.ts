import type { OrderDraft } from '@/features/orders/types/orderFlow.types';

const RECENT_CUSTOMERS_KEY = 'bera:order-recent-customers-v1';
const LAST_BRANCH_KEY = 'bera:order-last-branch-v1';
const RECENT_PRODUCTS_KEY = 'bera:order-recent-products-v1';

export interface RecentCustomerPref {
  id: string;
  name: string;
  code: string;
  usedAt: string;
}

export interface LastBranchPref {
  branchId: string;
  branchName: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}

export function getRecentCustomers(limit = 5): RecentCustomerPref[] {
  const list = readJson<RecentCustomerPref[]>(RECENT_CUSTOMERS_KEY, []);
  return list
    .slice()
    .sort((a, b) => b.usedAt.localeCompare(a.usedAt))
    .slice(0, limit);
}

export function rememberRecentCustomer(
  customer: Pick<RecentCustomerPref, 'id' | 'name' | 'code'>,
): void {
  const now = new Date().toISOString();
  const prev = readJson<RecentCustomerPref[]>(RECENT_CUSTOMERS_KEY, []);
  const next = [
    { ...customer, usedAt: now },
    ...prev.filter((row) => row.id !== customer.id),
  ].slice(0, 12);
  writeJson(RECENT_CUSTOMERS_KEY, next);
}

export function getLastBranchForCustomer(
  customerId: string,
): LastBranchPref | null {
  const map = readJson<Record<string, LastBranchPref>>(LAST_BRANCH_KEY, {});
  return map[customerId] ?? null;
}

export function rememberLastBranch(
  customerId: string,
  branch: LastBranchPref,
): void {
  const map = readJson<Record<string, LastBranchPref>>(LAST_BRANCH_KEY, {});
  map[customerId] = branch;
  writeJson(LAST_BRANCH_KEY, map);
}

export function getRecentProductIds(limit = 8): string[] {
  return readJson<string[]>(RECENT_PRODUCTS_KEY, []).slice(0, limit);
}

export function rememberRecentProduct(productId: string): void {
  const prev = readJson<string[]>(RECENT_PRODUCTS_KEY, []);
  const next = [productId, ...prev.filter((id) => id !== productId)].slice(
    0,
    24,
  );
  writeJson(RECENT_PRODUCTS_KEY, next);
}

/** Draft fields only — used by persist hook (does not touch orderDraftStore file). */
export type PersistedOrderDraft = Pick<
  OrderDraft,
  | 'step'
  | 'customerId'
  | 'customerName'
  | 'customerCode'
  | 'branchId'
  | 'branchName'
  | 'lines'
  | 'notes'
>;
