/**
 * Logo → IndexedDB customer sync (Stage 3C-2).
 *
 * - Writes only to local IndexedDB customers.
 * - Does not read/write/delete CustomerBranch.
 * - Does not touch orders, orderLines, or outbox.
 * - Does not push to Firestore / PullSync / PushSync.
 * - On API failure / empty / invalid: preserves all local customers.
 * - Match: primary erpId←LOGICALREF; controlled CODE fallback.
 * - Conflicts reported; no auto-merge; no hard delete / auto-passive this stage.
 *
 * CLCARD.SPECODE → logoSalesRepCode (satış elemanı). Şube değildir.
 * ORFICHE.SPECODE = BERA branchName — bu servisin konusu değil.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  META_KEYS,
  getMetaValue,
  setMetaValue,
  type LocalCustomer,
} from '@/shared/lib/indexeddb/db';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { isLogoCustomersApiConfigured } from '@/config/env';
import {
  fetchLogoCustomerRows,
  LogoCustomerApiError,
  type LogoCustomerRow,
} from './logoCustomerApiClient';
import {
  applyLogoFieldsToCustomer,
  logoFieldsForNewCustomer,
  mapLogoRowToCustomerFields,
  type LogoMappedCustomerFields,
} from './logoCustomerMapper';

export type LogoCustomerSyncConflictType =
  | 'duplicate_logo_erp_id'
  | 'duplicate_local_code'
  | 'code_fallback_erp_mismatch'
  | 'missing_code'
  | 'missing_logicalref';

export interface LogoCustomerSyncConflict {
  type: LogoCustomerSyncConflictType;
  erpId: string;
  code: string;
  name?: string;
  existingCustomerId?: string;
  otherCustomerId?: string;
  message: string;
}

export interface LogoCustomerSyncReport {
  success: boolean;
  startedAt: string;
  completedAt: string;
  fetchedRows: number;
  updated: number;
  created: number;
  skipped: number;
  conflicts: LogoCustomerSyncConflict[];
  errors: string[];
  /** True when API failed / invalid and local IndexedDB was left untouched. */
  localDataPreserved: boolean;
}

export interface LogoCustomerSyncOptions {
  userId?: string;
  signal?: AbortSignal;
  /** When true, only compute match/conflict plan — no IndexedDB writes. */
  dryRun?: boolean;
}

function buildIndexes(customers: LocalCustomer[]) {
  const byErpId = new Map<string, LocalCustomer[]>();
  const byCode = new Map<string, LocalCustomer[]>();

  for (const c of customers) {
    if (c.isDeleted) continue;
    const erpId = (c.erpId ?? '').trim();
    if (erpId) {
      const list = byErpId.get(erpId) ?? [];
      list.push(c);
      byErpId.set(erpId, list);
    }
    const code = c.code.trim().toUpperCase();
    if (code) {
      const list = byCode.get(code) ?? [];
      list.push(c);
      byCode.set(code, list);
    }
  }

  return { byErpId, byCode };
}

function pickOne(
  list: LocalCustomer[] | undefined,
): LocalCustomer | undefined {
  if (!list || list.length === 0) return undefined;
  return list[0];
}

type MatchPlan =
  | { action: 'skip'; reason: string }
  | { action: 'conflict'; conflict: LogoCustomerSyncConflict }
  | { action: 'update'; customer: LocalCustomer; matchedBy: 'erpId' | 'code' }
  | { action: 'create' };

/**
 * Pure matching for one mapped Logo row against local indexes.
 * Exported for unit tests.
 */
export function planLogoCustomerRowMatch(
  mapped: LogoMappedCustomerFields,
  byErpId: Map<string, LocalCustomer[]>,
  byCode: Map<string, LocalCustomer[]>,
  seenLogoErpIds: Set<string>,
): MatchPlan {
  if (seenLogoErpIds.has(mapped.erpId)) {
    return {
      action: 'conflict',
      conflict: {
        type: 'duplicate_logo_erp_id',
        erpId: mapped.erpId,
        code: mapped.code,
        name: mapped.name,
        message: `Logo yanıtında aynı LOGICALREF birden fazla: ${mapped.erpId}`,
      },
    };
  }
  seenLogoErpIds.add(mapped.erpId);

  const erpHits = byErpId.get(mapped.erpId) ?? [];
  const codeKey = mapped.code.trim().toUpperCase();
  const codeHits = byCode.get(codeKey) ?? [];

  // Primary: erpId === LOGICALREF
  if (erpHits.length > 1) {
    return {
      action: 'conflict',
      conflict: {
        type: 'duplicate_logo_erp_id',
        erpId: mapped.erpId,
        code: mapped.code,
        name: mapped.name,
        existingCustomerId: erpHits[0]?.id,
        otherCustomerId: erpHits[1]?.id,
        message: `Yerelde aynı erpId (LOGICALREF) birden fazla cari: ${mapped.erpId}`,
      },
    };
  }

  const byErpHit = pickOne(erpHits);
  if (byErpHit) {
    return { action: 'update', customer: byErpHit, matchedBy: 'erpId' };
  }

  // Controlled CODE fallback when erpId did not match
  if (codeHits.length > 1) {
    return {
      action: 'conflict',
      conflict: {
        type: 'duplicate_local_code',
        erpId: mapped.erpId,
        code: mapped.code,
        name: mapped.name,
        existingCustomerId: codeHits[0]?.id,
        otherCustomerId: codeHits[1]?.id,
        message: `Yerelde aynı code birden fazla caride (birleştirilmedi): ${mapped.code}`,
      },
    };
  }

  const byCodeHit = pickOne(codeHits);
  if (byCodeHit) {
    const existingErp = (byCodeHit.erpId ?? '').trim();
    if (existingErp && existingErp !== mapped.erpId) {
      return {
        action: 'conflict',
        conflict: {
          type: 'code_fallback_erp_mismatch',
          erpId: mapped.erpId,
          code: mapped.code,
          name: mapped.name,
          existingCustomerId: byCodeHit.id,
          message:
            `CODE eşleşti ancak yereldeki erpId (${existingErp}) Logo LOGICALREF (${mapped.erpId}) ile uyuşmuyor. Değiştirilmedi.`,
        },
      };
    }
    return { action: 'update', customer: byCodeHit, matchedBy: 'code' };
  }

  return { action: 'create' };
}

function applyIndexMutation(
  byErpId: Map<string, LocalCustomer[]>,
  byCode: Map<string, LocalCustomer[]>,
  before: LocalCustomer | undefined,
  after: LocalCustomer,
): void {
  if (before) {
    const oldErp = (before.erpId ?? '').trim();
    if (oldErp) {
      const list = (byErpId.get(oldErp) ?? []).filter((c) => c.id !== before.id);
      if (list.length) byErpId.set(oldErp, list);
      else byErpId.delete(oldErp);
    }
    const oldCode = before.code.trim().toUpperCase();
    if (oldCode) {
      const list = (byCode.get(oldCode) ?? []).filter((c) => c.id !== before.id);
      if (list.length) byCode.set(oldCode, list);
      else byCode.delete(oldCode);
    }
  }

  const erp = (after.erpId ?? '').trim();
  if (erp) {
    const list = byErpId.get(erp) ?? [];
    list.push(after);
    byErpId.set(erp, list);
  }
  const code = after.code.trim().toUpperCase();
  if (code) {
    const list = byCode.get(code) ?? [];
    list.push(after);
    byCode.set(code, list);
  }
}

async function applyMappedRows(
  rows: LogoCustomerRow[],
  options: LogoCustomerSyncOptions,
  startedAt: string,
): Promise<LogoCustomerSyncReport> {
  const userId = options.userId ?? 'logo-customer-sync';
  const conflicts: LogoCustomerSyncConflict[] = [];
  let updated = 0;
  let created = 0;
  let skipped = 0;

  const locals = await customerLocalRepository.getAll();
  const { byErpId, byCode } = buildIndexes(locals);
  const seenLogoErpIds = new Set<string>();
  const toSave: LocalCustomer[] = [];

  for (const row of rows) {
    const mapped = mapLogoRowToCustomerFields(row);
    if (!mapped) {
      skipped++;
      continue;
    }

    const plan = planLogoCustomerRowMatch(
      mapped,
      byErpId,
      byCode,
      seenLogoErpIds,
    );

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
      const next = applyLogoFieldsToCustomer(plan.customer, mapped, now);
      const saved: LocalCustomer = {
        ...next,
        updatedBy: userId,
        version: plan.customer.version + 1,
        // Local-only Logo stage — not pushed via outbox; manual upload later.
        syncStatus: 'pending',
        isDeleted: false,
      };
      toSave.push(saved);
      applyIndexMutation(byErpId, byCode, plan.customer, saved);
      updated++;
      continue;
    }

    // create
    const domain = logoFieldsForNewCustomer(mapped);
    const createdCustomer: LocalCustomer = {
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
    toSave.push(createdCustomer);
    applyIndexMutation(byErpId, byCode, undefined, createdCustomer);
    created++;
  }

  if (!options.dryRun) {
    if (toSave.length > 0) {
      await customerLocalRepository.saveMany(toSave);
    }
    // Successful sync meta — only after apply completes without throw.
    await setMetaValue(META_KEYS.LAST_LOGO_CUSTOMER_SYNC_AT, startedAt);
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

class LogoCustomerSyncService {
  async syncToIndexedDB(
    options: LogoCustomerSyncOptions = {},
  ): Promise<LogoCustomerSyncReport> {
    const startedAt = new Date().toISOString();

    if (!isLogoCustomersApiConfigured()) {
      return {
        success: false,
        startedAt,
        completedAt: new Date().toISOString(),
        fetchedRows: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        conflicts: [],
        errors: [
          'Logo cari API URL yapılandırılmamış (VITE_LOGO_CUSTOMERS_API_URL).',
        ],
        localDataPreserved: true,
      };
    }

    let rows: LogoCustomerRow[];
    try {
      rows = await fetchLogoCustomerRows(options.signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      const message =
        err instanceof LogoCustomerApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Logo cari API hatası';
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

    try {
      return await applyMappedRows(rows, options, startedAt);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Logo cari sync IndexedDB yazma hatası';
      return {
        success: false,
        startedAt,
        completedAt: new Date().toISOString(),
        fetchedRows: rows.length,
        updated: 0,
        created: 0,
        skipped: 0,
        conflicts: [],
        errors: [message],
        localDataPreserved: true,
      };
    }
  }

  /** Convenience: apply pre-fetched rows (tests / offline fixtures). */
  async applyRows(
    rows: LogoCustomerRow[],
    options: LogoCustomerSyncOptions = {},
  ): Promise<LogoCustomerSyncReport> {
    const startedAt = new Date().toISOString();

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        success: false,
        startedAt,
        completedAt: new Date().toISOString(),
        fetchedRows: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        conflicts: [],
        errors: [
          'Logo cari satır listesi boş veya geçersiz. Yerel cariler korunur.',
        ],
        localDataPreserved: true,
      };
    }

    try {
      return await applyMappedRows(rows, options, startedAt);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Logo cari sync IndexedDB yazma hatası';
      return {
        success: false,
        startedAt,
        completedAt: new Date().toISOString(),
        fetchedRows: rows.length,
        updated: 0,
        created: 0,
        skipped: 0,
        conflicts: [],
        errors: [message],
        localDataPreserved: true,
      };
    }
  }

  async getLastSyncAt(): Promise<string | undefined> {
    return getMetaValue(META_KEYS.LAST_LOGO_CUSTOMER_SYNC_AT);
  }
}

export const logoCustomerSyncService = new LogoCustomerSyncService();
