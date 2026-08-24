/**
 * Maps Logo API stock rows → BERA Product fields.
 *
 * Locked field meanings:
 *   LOGICALREF   → erpId      (ITEMS.LOGICALREF / STOCKREF) — required
 *   CODE         → barcode    — required (primary product identity)
 *   PRODUCERCODE → sku        — optional (empty PRODUCERCODE → empty sku)
 *   NAME         → name       — required (falls back to CODE if blank)
 *   STGRPCODE    → groupCode  — never category
 *   SPECODE      → specialCode
 *   SPECODE2     → specialCode2
 *   SPECODE5     → specialCode5
 *   VAT          → vatRate
 *   MERKEZ       → stockQuantity
 *   SATIS_FIYATI → listPrice
 *
 * CODE and PRODUCERCODE must never be swapped.
 * Empty PRODUCERCODE must NOT skip the product.
 */

import type { Product } from '@/shared/types/product.types';
import type { LogoStockRow } from './logoApiClient';

export interface LogoMappedProductFields {
  /** Logo LG_002_ITEMS.LOGICALREF */
  erpId: string;
  barcode: string;
  sku: string;
  name: string;
  groupCode?: string;
  specialCode?: string;
  specialCode2?: string;
  specialCode5?: string;
  vatRate: number;
  stockQuantity: number;
  listPrice: number;
  isActive: boolean;
}

function asTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function asNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n =
    typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function isLogoProductActive(value: unknown): boolean {
  // Logo ITEMS stores ACTIVE as 0 (usable) / 1 (usage disabled).
  if (value === null || value === undefined || value === '') return true;
  if (value === true || value === 'true') return false;
  return asNumber(value) !== 1;
}

/**
 * Map a single Logo row to Product field values.
 * Returns null when LOGICALREF or CODE is missing — both required for safe sync.
 */
export function mapLogoRowToProductFields(
  row: LogoStockRow,
): LogoMappedProductFields | null {
  const erpId = asTrimmedString(row.LOGICALREF);
  const barcode = asTrimmedString(row.CODE);
  if (!erpId || !barcode) {
    return null;
  }

  const producerCode = asTrimmedString(row.PRODUCERCODE);
  // sku is PRODUCERCODE only — never CODE. Empty PRODUCERCODE → empty sku (still valid).
  const sku = producerCode ? producerCode.toUpperCase() : '';
  const name = asTrimmedString(row.NAME) || barcode;
  const groupCode = asTrimmedString(row.STGRPCODE) || undefined;
  const specialCode = asTrimmedString(row.SPECODE) || undefined;
  const specialCode2 = asTrimmedString(row.SPECODE2) || undefined;
  const specialCode5 = asTrimmedString(row.SPECODE5) || undefined;
  const vatRate = asNumber(row.VAT, 20);
  const stockQuantity = asNumber(row.MERKEZ, 0);
  const listPrice = asNumber(row.SATIS_FIYATI, 0);
  const isActive = isLogoProductActive(row.ACTIVE);

  return {
    erpId,
    barcode,
    sku,
    name,
    groupCode,
    specialCode,
    specialCode2,
    specialCode5,
    vatRate,
    stockQuantity,
    listPrice,
    isActive,
  };
}

/**
 * Apply mapped Logo fields onto an existing product.
 * Does NOT overwrite category (STGRPCODE → groupCode only).
 */
export function applyLogoFieldsToProduct(
  existing: Product,
  mapped: LogoMappedProductFields,
  now: string = new Date().toISOString(),
): Product {
  return {
    ...existing,
    erpId: mapped.erpId,
    barcode: mapped.barcode,
    sku: mapped.sku,
    name: mapped.name,
    groupCode: mapped.groupCode,
    specialCode: mapped.specialCode,
    specialCode2: mapped.specialCode2,
    specialCode5: mapped.specialCode5,
    vatRate: mapped.vatRate,
    stockQuantity: mapped.stockQuantity,
    listPrice: mapped.listPrice,
    // category intentionally unchanged
    isActive: mapped.isActive,
    updatedAt: now,
  };
}

/**
 * Product domain fields for a new local product from Logo.
 * category stays empty-ish default — Logo STGRPCODE must not become category.
 * Caller fills BaseEntity fields (id, syncStatus, audit, …).
 */
export function logoFieldsForNewProduct(
  mapped: LogoMappedProductFields,
): Pick<
  Product,
  | 'sku'
  | 'barcode'
  | 'name'
  | 'category'
  | 'groupCode'
  | 'specialCode'
  | 'specialCode2'
  | 'specialCode5'
  | 'unit'
  | 'listPrice'
  | 'vatRate'
  | 'stockQuantity'
  | 'isActive'
  | 'erpId'
> {
  return {
    sku: mapped.sku,
    barcode: mapped.barcode,
    name: mapped.name,
    category: 'Genel',
    groupCode: mapped.groupCode,
    specialCode: mapped.specialCode,
    specialCode2: mapped.specialCode2,
    specialCode5: mapped.specialCode5,
    unit: 'Adet',
    listPrice: mapped.listPrice,
    vatRate: mapped.vatRate,
    stockQuantity: mapped.stockQuantity,
    isActive: mapped.isActive,
    erpId: mapped.erpId,
  };
}
