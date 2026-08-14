/**
 * Logo → IndexedDB product sync (Stage 1).
 *
 * - Writes only to local IndexedDB products.
 * - Does not push to Firestore / outbox / PullSync / PushSync.
 * - On API failure: preserves all local product/stock data.
 * - Match: primary CODE→barcode; fallback PRODUCERCODE→sku (controlled).
 * - Conflicts are reported; products are never auto-deleted or merged.
 * - category is never overwritten by STGRPCODE (groupCode only).
 */

import { v4 as uuidv4 } from 'uuid';
import {
  META_KEYS,
  setMetaValue,
  type LocalProduct,
} from '@/shared/lib/indexeddb/db';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import { isLogoApiConfigured } from '@/config/env';
import { fetchLogoStockRows, LogoApiError, type LogoStockRow } from './logoApiClient';
import {
  applyLogoFieldsToProduct,
  logoFieldsForNewProduct,
  mapLogoRowToProductFields,
  type LogoMappedProductFields,
} from './logoProductMapper';

export type LogoSyncConflictType =
  | 'barcode_sku_cross_match'
  | 'sku_owned_by_other'
  | 'sku_fallback_barcode_mismatch'
  | 'duplicate_logo_barcode'
  | 'missing_producer_code';

export interface LogoSyncConflict {
  type: LogoSyncConflictType;
  barcode: string;
  sku: string;
  name?: string;
  existingProductId?: string;
  otherProductId?: string;
  message: string;
}

export interface LogoProductSyncReport {
  success: boolean;
  startedAt: string;
  completedAt: string;
  fetchedRows: number;
  updated: number;
  created: number;
  skipped: number;
  conflicts: LogoSyncConflict[];
  errors: string[];
  /** True when API failed and local IndexedDB was left untouched. */
  localDataPreserved: boolean;
}

export interface LogoProductSyncOptions {
  userId?: string;
  signal?: AbortSignal;
  /** When true, only compute match/conflict plan — no IndexedDB writes. */
  dryRun?: boolean;
}

function buildIndexes(products: LocalProduct[]) {
  const byBarcode = new Map<string, LocalProduct[]>();
  const bySku = new Map<string, LocalProduct[]>();

  for (const p of products) {
    if (p.isDeleted) continue;
    const barcode = (p.barcode ?? '').trim();
    if (barcode) {
      const list = byBarcode.get(barcode) ?? [];
      list.push(p);
      byBarcode.set(barcode, list);
    }
    const sku = p.sku.trim().toUpperCase();
    if (sku) {
      const list = bySku.get(sku) ?? [];
      list.push(p);
      bySku.set(sku, list);
    }
  }

  return { byBarcode, bySku };
}

function pickOne(list: LocalProduct[] | undefined): LocalProduct | undefined {
  if (!list || list.length === 0) return undefined;
  return list[0];
}

type MatchPlan =
  | { action: 'skip'; reason: string }
  | { action: 'conflict'; conflict: LogoSyncConflict }
  | { action: 'update'; product: LocalProduct; matchedBy: 'barcode' | 'sku' }
  | { action: 'create' };

/**
 * Pure matching for one mapped Logo row against local indexes.
 * Exported for unit tests.
 */
export function planLogoRowMatch(
  mapped: LogoMappedProductFields,
  byBarcode: Map<string, LocalProduct[]>,
  bySku: Map<string, LocalProduct[]>,
  seenLogoBarcodes: Set<string>,
): MatchPlan {
  if (seenLogoBarcodes.has(mapped.barcode)) {
    return {
      action: 'conflict',
      conflict: {
        type: 'duplicate_logo_barcode',
        barcode: mapped.barcode,
        sku: mapped.sku,
        name: mapped.name,
        message: `Logo yanıtında aynı CODE (barkod) birden fazla: ${mapped.barcode}`,
      },
    };
  }
  seenLogoBarcodes.add(mapped.barcode);

  if (!mapped.sku) {
    return {
      action: 'conflict',
      conflict: {
        type: 'missing_producer_code',
        barcode: mapped.barcode,
        sku: '',
        name: mapped.name,
        message: `PRODUCERCODE (ürün kodu) boş; CODE=${mapped.barcode} işlenmedi.`,
      },
    };
  }

  const barcodeHits = byBarcode.get(mapped.barcode) ?? [];
  const skuHits = bySku.get(mapped.sku) ?? [];

  if (barcodeHits.length > 1) {
    return {
      action: 'conflict',
      conflict: {
        type: 'barcode_sku_cross_match',
        barcode: mapped.barcode,
        sku: mapped.sku,
        name: mapped.name,
        existingProductId: barcodeHits[0]?.id,
        otherProductId: barcodeHits[1]?.id,
        message: `Yerelde aynı barkod birden fazla üründe: ${mapped.barcode}`,
      },
    };
  }

  const byBarcodeHit = pickOne(barcodeHits);
  const bySkuHit = pickOne(skuHits.filter((p) => p.id !== byBarcodeHit?.id));

  if (byBarcodeHit) {
    // Barcode matches product A; sku owned by different product B → conflict
    if (bySkuHit && bySkuHit.id !== byBarcodeHit.id) {
      return {
        action: 'conflict',
        conflict: {
          type: 'barcode_sku_cross_match',
          barcode: mapped.barcode,
          sku: mapped.sku,
          name: mapped.name,
          existingProductId: byBarcodeHit.id,
          otherProductId: bySkuHit.id,
          message:
            `CODE→barcode eşleşmesi ürün ${byBarcodeHit.id}; PRODUCERCODE→sku başka ürün ${bySkuHit.id}. Birleştirilmedi.`,
        },
      };
    }

    // Updating sku on barcode-matched product would collide with another row's sku
    if (
      byBarcodeHit.sku.trim().toUpperCase() !== mapped.sku &&
      skuHits.some((p) => p.id !== byBarcodeHit.id)
    ) {
      const other = skuHits.find((p) => p.id !== byBarcodeHit.id)!;
      return {
        action: 'conflict',
        conflict: {
          type: 'sku_owned_by_other',
          barcode: mapped.barcode,
          sku: mapped.sku,
          name: mapped.name,
          existingProductId: byBarcodeHit.id,
          otherProductId: other.id,
          message:
            `Barkod eşleşti ancak PRODUCERCODE (${mapped.sku}) başka ürüne ait. Güncellenmedi.`,
        },
      };
    }

    return { action: 'update', product: byBarcodeHit, matchedBy: 'barcode' };
  }

  // Controlled SKU fallback when barcode did not match
  if (skuHits.length > 1) {
    return {
      action: 'conflict',
      conflict: {
        type: 'sku_owned_by_other',
        barcode: mapped.barcode,
        sku: mapped.sku,
        name: mapped.name,
        existingProductId: skuHits[0]?.id,
        otherProductId: skuHits[1]?.id,
        message: `Yerelde aynı sku birden fazla üründe: ${mapped.sku}`,
      },
    };
  }

  const skuOnly = pickOne(skuHits);
  if (skuOnly) {
    const existingBarcode = (skuOnly.barcode ?? '').trim();
    if (existingBarcode && existingBarcode !== mapped.barcode) {
      return {
        action: 'conflict',
        conflict: {
          type: 'sku_fallback_barcode_mismatch',
          barcode: mapped.barcode,
          sku: mapped.sku,
          name: mapped.name,
          existingProductId: skuOnly.id,
          message:
            `SKU eşleşti ancak yereldeki barkod (${existingBarcode}) Logo CODE (${mapped.barcode}) ile uyuşmuyor. Değiştirilmedi.`,
        },
      };
    }

    return { action: 'update', product: skuOnly, matchedBy: 'sku' };
  }

  return { action: 'create' };
}

function applyIndexMutation(
  byBarcode: Map<string, LocalProduct[]>,
  bySku: Map<string, LocalProduct[]>,
  before: LocalProduct | undefined,
  after: LocalProduct,
): void {
  if (before) {
    const oldBc = (before.barcode ?? '').trim();
    if (oldBc) {
      const list = (byBarcode.get(oldBc) ?? []).filter((p) => p.id !== before.id);
      if (list.length) byBarcode.set(oldBc, list);
      else byBarcode.delete(oldBc);
    }
    const oldSku = before.sku.trim().toUpperCase();
    if (oldSku) {
      const list = (bySku.get(oldSku) ?? []).filter((p) => p.id !== before.id);
      if (list.length) bySku.set(oldSku, list);
      else bySku.delete(oldSku);
    }
  }

  const bc = (after.barcode ?? '').trim();
  if (bc) {
    const list = byBarcode.get(bc) ?? [];
    list.push(after);
    byBarcode.set(bc, list);
  }
  const sku = after.sku.trim().toUpperCase();
  if (sku) {
    const list = bySku.get(sku) ?? [];
    list.push(after);
    bySku.set(sku, list);
  }
}

class LogoProductSyncService {
  async syncToIndexedDB(
    options: LogoProductSyncOptions = {},
  ): Promise<LogoProductSyncReport> {
    const startedAt = new Date().toISOString();
    const userId = options.userId ?? 'logo-sync';
    const errors: string[] = [];
    const conflicts: LogoSyncConflict[] = [];
    let fetchedRows = 0;
    let updated = 0;
    let created = 0;
    let skipped = 0;

    if (!isLogoApiConfigured()) {
      return {
        success: false,
        startedAt,
        completedAt: new Date().toISOString(),
        fetchedRows: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        conflicts: [],
        errors: ['Logo API URL yapılandırılmamış (VITE_LOGO_API_URL).'],
        localDataPreserved: true,
      };
    }

    let rows: LogoStockRow[];
    try {
      rows = await fetchLogoStockRows(options.signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      const message =
        err instanceof LogoApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Logo API hatası';
      return {
        success: false,
        startedAt,
        completedAt: new Date().toISOString(),
        fetchedRows: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        conflicts: [],
        errors: [message],
        localDataPreserved: true,
      };
    }

    fetchedRows = rows.length;

    try {
      const locals = await productLocalRepository.getAll();
      const { byBarcode, bySku } = buildIndexes(locals);
      const seenLogoBarcodes = new Set<string>();
      const toSave: LocalProduct[] = [];

      for (const row of rows) {
        const mapped = mapLogoRowToProductFields(row);
        if (!mapped) {
          skipped++;
          continue;
        }

        const plan = planLogoRowMatch(mapped, byBarcode, bySku, seenLogoBarcodes);

        if (plan.action === 'skip') {
          skipped++;
          continue;
        }

        if (plan.action === 'conflict') {
          conflicts.push(plan.conflict);
          skipped++;
          continue;
        }

        const now = new Date().toISOString();

        if (plan.action === 'update') {
          const next = applyLogoFieldsToProduct(plan.product, mapped, now);
          const saved: LocalProduct = {
            ...next,
            updatedBy: userId,
            version: plan.product.version + 1,
            // Local-only Logo stage 1 — not pushed via outbox; upload tool later.
            syncStatus: 'pending',
            isDeleted: false,
          };
          toSave.push(saved);
          applyIndexMutation(byBarcode, bySku, plan.product, saved);
          updated++;
          continue;
        }

        // create
        const domain = logoFieldsForNewProduct(mapped, now);
        const createdProduct: LocalProduct = {
          id: uuidv4(),
          localId: uuidv4(),
          ...domain,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
          version: 1,
          syncStatus: 'pending',
        };
        toSave.push(createdProduct);
        applyIndexMutation(byBarcode, bySku, undefined, createdProduct);
        created++;
      }

      if (!options.dryRun && toSave.length > 0) {
        await productLocalRepository.saveMany(toSave);
        await setMetaValue(META_KEYS.LAST_LOGO_PRODUCT_SYNC_AT, startedAt);
      }

      return {
        success: true,
        startedAt,
        completedAt: new Date().toISOString(),
        fetchedRows,
        updated,
        created,
        skipped,
        conflicts,
        errors,
        localDataPreserved: true,
      };
    } catch (err) {
      // Never clear products on apply failure
      const message =
        err instanceof Error ? err.message : 'Logo sync IndexedDB yazma hatası';
      errors.push(message);
      return {
        success: false,
        startedAt,
        completedAt: new Date().toISOString(),
        fetchedRows,
        updated: 0,
        created: 0,
        skipped,
        conflicts,
        errors,
        localDataPreserved: true,
      };
    }
  }

  /** Convenience: apply pre-fetched rows (tests / offline fixtures). */
  async applyRows(
    rows: LogoStockRow[],
    options: LogoProductSyncOptions = {},
  ): Promise<LogoProductSyncReport> {
    const startedAt = new Date().toISOString();
    const userId = options.userId ?? 'logo-sync';
    const conflicts: LogoSyncConflict[] = [];
    let updated = 0;
    let created = 0;
    let skipped = 0;

    const locals = await productLocalRepository.getAll();
    const { byBarcode, bySku } = buildIndexes(locals);
    const seenLogoBarcodes = new Set<string>();
    const toSave: LocalProduct[] = [];

    for (const row of rows) {
      const mapped = mapLogoRowToProductFields(row);
      if (!mapped) {
        skipped++;
        continue;
      }

      const plan = planLogoRowMatch(mapped, byBarcode, bySku, seenLogoBarcodes);
      if (plan.action === 'conflict') {
        conflicts.push(plan.conflict);
        skipped++;
        continue;
      }
      if (plan.action === 'skip') {
        skipped++;
        continue;
      }

      const now = new Date().toISOString();
      if (plan.action === 'update') {
        const next = applyLogoFieldsToProduct(plan.product, mapped, now);
        const saved: LocalProduct = {
          ...next,
          updatedBy: userId,
          version: plan.product.version + 1,
          syncStatus: 'pending',
          isDeleted: false,
        };
        toSave.push(saved);
        applyIndexMutation(byBarcode, bySku, plan.product, saved);
        updated++;
      } else {
        const domain = logoFieldsForNewProduct(mapped, now);
        const createdProduct: LocalProduct = {
          id: uuidv4(),
          localId: uuidv4(),
          ...domain,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
          version: 1,
          syncStatus: 'pending',
        };
        toSave.push(createdProduct);
        applyIndexMutation(byBarcode, bySku, undefined, createdProduct);
        created++;
      }
    }

    if (!options.dryRun && toSave.length > 0) {
      await productLocalRepository.saveMany(toSave);
      await setMetaValue(META_KEYS.LAST_LOGO_PRODUCT_SYNC_AT, startedAt);
    }

    return {
      success: true,
      startedAt,
      completedAt: new Date().toISOString(),
      fetchedRows: rows.length,
      updated,
      created,
      skipped,
      conflicts,
      errors: [],
      localDataPreserved: true,
    };
  }
}

export const logoProductSyncService = new LogoProductSyncService();
