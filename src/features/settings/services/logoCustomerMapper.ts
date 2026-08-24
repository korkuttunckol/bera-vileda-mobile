/**
 * Maps Logo CLCARD API rows → BERA Customer fields.
 *
 * Locked field meanings:
 *   LOGICALREF           → erpId
 *   CODE                 → code
 *   DEFINITION_ / DEFINITION → name
 *   SPECODE              → logoSalesRepCode  (satış elemanı kodu — ŞUBE DEĞİL)
 *   SPECODE2             → specialCode2
 *   CITY                 → address.city
 *   TOWN                 → address.district
 *
 * SPECODE must NEVER be written to salesRepId (BERA uid / audit).
 * CustomerBranch is out of scope — mapper does not touch branches.
 */

import type { Customer, CustomerAddress } from '@/shared/types/customer.types';
import type { LogoCustomerRow } from './logoCustomerApiClient';

export interface LogoMappedCustomerFields {
  erpId: string;
  code: string;
  name: string;
  logoSalesRepCode?: string;
  specialCode2?: string;
  logoSpecialCode5?: string;
  address: CustomerAddress;
  balanceDebit?: number;
  balanceCredit?: number;
  balance?: number;
  /** Logo CLCARD.ACTIVE: 0 = active, 1 = usage disabled. */
  isActive: boolean;
}

function asTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function asOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function readLogoBalanceField(row: LogoCustomerRow, key: string): number | undefined {
  return asOptionalNumber(row[key]);
}

function isLogoCustomerActive(value: unknown): boolean {
  // Logo CLCARD stores ACTIVE as 0 (usable) / 1 (usage disabled).
  // Missing values stay compatible with older handlers: active by default.
  if (value === null || value === undefined || value === '') return true;
  if (value === true || value === 'true') return false;
  return asOptionalNumber(value) !== 1;
}

function pickDefinition(row: LogoCustomerRow): string {
  const fromUnderscore = asTrimmedString(row.DEFINITION_);
  if (fromUnderscore) return fromUnderscore;
  return asTrimmedString(row.DEFINITION);
}

/**
 * Map a single Logo CLCARD row to Customer field values.
 * Returns null when LOGICALREF or CODE is missing — both required for safe match.
 */
export function mapLogoRowToCustomerFields(
  row: LogoCustomerRow,
): LogoMappedCustomerFields | null {
  const erpId = asTrimmedString(row.LOGICALREF);
  const code = asTrimmedString(row.CODE);
  if (!erpId || !code) {
    return null;
  }

  const name = pickDefinition(row) || code;
  const logoSalesRepCode = asTrimmedString(row.SPECODE) || undefined;
  const specialCode2 = asTrimmedString(row.SPECODE2) || undefined;
  const logoSpecialCode5 = asTrimmedString(row.SPECODE5) || undefined;
  const city = asTrimmedString(row.CITY) || undefined;
  const district = asTrimmedString(row.TOWN) || undefined;

  const address: CustomerAddress = {};
  if (city) address.city = city;
  if (district) address.district = district;

  const balanceDebit = readLogoBalanceField(row, 'Borç');
  const balanceCredit = readLogoBalanceField(row, 'Alacak');
  const reportedBalance = readLogoBalanceField(row, 'Bakiye');
  // Some older Logo handlers send Borç/Alacak but omit Bakiye.
  // Derive the same card balance in that case instead of leaving it blank.
  const balance = reportedBalance ?? (
    balanceDebit !== undefined && balanceCredit !== undefined
      ? balanceDebit - balanceCredit
      : undefined
  );
  const isActive = isLogoCustomerActive(row.ACTIVE);

  return {
    erpId,
    code,
    name,
    logoSalesRepCode,
    specialCode2,
    logoSpecialCode5,
    address,
    balanceDebit,
    balanceCredit,
    balance,
    isActive,
  };
}

/**
 * Apply mapped Logo fields onto an existing customer.
 * Does NOT overwrite salesRepId, CustomerBranch, or order-related data.
 * Preserves fullAddress / contact / tax / phone when present.
 */
export function applyLogoFieldsToCustomer(
  existing: Customer,
  mapped: LogoMappedCustomerFields,
  now: string = new Date().toISOString(),
): Customer {
  const prevAddress = existing.address ?? {};
  return {
    ...existing,
    erpId: mapped.erpId,
    code: mapped.code,
    name: mapped.name,
    logoSalesRepCode: mapped.logoSalesRepCode,
    specialCode2: mapped.specialCode2,
    logoSpecialCode5: mapped.logoSpecialCode5,
    address: {
      ...prevAddress,
      city: mapped.address.city ?? prevAddress.city,
      district: mapped.address.district ?? prevAddress.district,
    },
    balanceDebit: mapped.balanceDebit,
    balanceCredit: mapped.balanceCredit,
    balance: mapped.balance,
    isActive: mapped.isActive,
    // salesRepId intentionally unchanged — BERA audit, not Logo SPECODE
    updatedAt: now,
  };
}

/**
 * Domain fields for a new local customer from Logo.
 * salesRepId stays empty string — never filled from SPECODE.
 * Caller fills BaseEntity fields (id, syncStatus, audit, …).
 */
export function logoFieldsForNewCustomer(
  mapped: LogoMappedCustomerFields,
): Pick<
  Customer,
  | 'code'
  | 'name'
  | 'erpId'
  | 'logoSalesRepCode'
  | 'specialCode2'
  | 'logoSpecialCode5'
  | 'address'
  | 'salesRepId'
  | 'isActive'
  | 'source'
  | 'balanceDebit'
  | 'balanceCredit'
  | 'balance'
> {
  return {
    code: mapped.code,
    name: mapped.name,
    erpId: mapped.erpId,
    logoSalesRepCode: mapped.logoSalesRepCode,
    specialCode2: mapped.specialCode2,
    logoSpecialCode5: mapped.logoSpecialCode5,
    address: { ...mapped.address },
    balanceDebit: mapped.balanceDebit,
    balanceCredit: mapped.balanceCredit,
    balance: mapped.balance,
    salesRepId: '',
    isActive: mapped.isActive,
    source: 'logo',
  };
}
