/**
 * Normalization / validation helpers for user permission profile arrays.
 *
 * Case policy (explicit — no silent assumption):
 * - Values are trimmed; empty strings dropped; duplicates removed (first wins).
 * - Case is preserved as entered. Logo Customer.CODE is stored trimmed without
 *   forced uppercasing in the mapper; Admin customer forms may uppercase on edit.
 *   Callers that need a specific case must normalize before compare in a later PR.
 */

import type { UserPermissionProfile } from '@/shared/types/userPermission.types';
import { EMPTY_USER_PERMISSION_PROFILE } from '@/shared/types/userPermission.types';

/** Trim, drop empties, dedupe (stable order). Does not change letter case. */
export function normalizeStringList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/**
 * PREFIX wildcard only: one or more non-* chars, then a single trailing `*`.
 * Rejects: empty, `*`, `*08`, `0*8`, `08**`, `08*1`, bare codes without `*`.
 */
export function isValidMerchCustomerPrefixPattern(value: string): boolean {
  const v = value.trim();
  if (!v.endsWith('*')) return false;
  const prefix = v.slice(0, -1);
  if (!prefix) return false;
  if (prefix.includes('*')) return false;
  return true;
}

export function normalizeSalesRepCodes(values: readonly string[]): string[] {
  return normalizeStringList(values);
}

export function normalizeMerchCustomerCodes(values: readonly string[]): string[] {
  return normalizeStringList(values);
}

export function normalizeMerchStockGroupCodes(
  values: readonly string[],
): string[] {
  return normalizeStringList(values);
}

export function normalizeFieldMaskKeys(values: readonly string[]): string[] {
  return normalizeStringList(values);
}

/**
 * Normalizes patterns and drops invalid ones.
 * Returns `{ patterns, rejected }` so Admin UI can surface rejects later.
 */
export function normalizeMerchCustomerPatterns(
  values: readonly string[],
): { patterns: string[]; rejected: string[] } {
  const rejected: string[] = [];
  const accepted: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    if (!isValidMerchCustomerPrefixPattern(value)) {
      rejected.push(value);
      continue;
    }
    accepted.push(value);
  }
  return { patterns: normalizeStringList(accepted), rejected };
}

/** Strict: throws if any pattern is invalid (after trim of empties). */
export function assertValidMerchCustomerPatterns(
  values: readonly string[],
): string[] {
  const { patterns, rejected } = normalizeMerchCustomerPatterns(values);
  if (rejected.length > 0) {
    throw new Error(
      `Geçersiz Merch cari pattern (yalnızca PREFIX* desteklenir): ${rejected.join(', ')}`,
    );
  }
  return patterns;
}

export function normalizeUserPermissionProfile(
  partial: Partial<UserPermissionProfile> | null | undefined,
): UserPermissionProfile {
  const base = partial ?? {};
  const { patterns } = normalizeMerchCustomerPatterns(
    base.merchCustomerPatterns ?? [],
  );
  return {
    salesRepCodes: normalizeSalesRepCodes(base.salesRepCodes ?? []),
    merchCustomerPatterns: patterns,
    merchCustomerCodes: normalizeMerchCustomerCodes(
      base.merchCustomerCodes ?? [],
    ),
    merchStockGroupCodes: normalizeMerchStockGroupCodes(
      base.merchStockGroupCodes ?? [],
    ),
    customerFieldMask: normalizeFieldMaskKeys(base.customerFieldMask ?? []),
    productFieldMask: normalizeFieldMaskKeys(base.productFieldMask ?? []),
  };
}

export function permissionProfileFromUserLike(
  user: Partial<UserPermissionProfile> | null | undefined,
): UserPermissionProfile {
  if (!user) return { ...EMPTY_USER_PERMISSION_PROFILE };
  return normalizeUserPermissionProfile(user);
}

/** Parse textarea / comma / newline lists into string arrays (pre-normalize). */
export function parsePermissionListText(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatPermissionListText(values: readonly string[]): string {
  return values.join('\n');
}
