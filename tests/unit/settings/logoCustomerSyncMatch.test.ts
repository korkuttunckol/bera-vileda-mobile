import { describe, expect, it } from 'vitest';
import { planLogoCustomerRowMatch } from '@/features/settings/services/logoCustomerSyncService';
import type { LogoMappedCustomerFields } from '@/features/settings/services/logoCustomerMapper';
import type { LocalCustomer } from '@/shared/lib/indexeddb/db';

function customer(
  overrides: Partial<LocalCustomer> &
    Pick<LocalCustomer, 'id' | 'code'> & { erpId?: string },
): LocalCustomer {
  return {
    localId: overrides.id,
    name: overrides.name ?? 'C',
    salesRepId: overrides.salesRepId ?? 'uid',
    isActive: true,
    isDeleted: false,
    source: 'excel',
    createdAt: 't',
    updatedAt: 't',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

function mapped(
  partial: Partial<LogoMappedCustomerFields> &
    Pick<LogoMappedCustomerFields, 'erpId' | 'code'>,
): LogoMappedCustomerFields {
  return {
    name: 'N',
    address: {},
    ...partial,
  };
}

describe('planLogoCustomerRowMatch', () => {
  it('matches primarily by erpId (LOGICALREF)', () => {
    const c = customer({ id: 'a', code: 'C1', erpId: '100' });
    const byErpId = new Map([['100', [c]]]);
    const byCode = new Map([['C1', [c]]]);
    const plan = planLogoCustomerRowMatch(
      mapped({ erpId: '100', code: 'C1', name: 'Updated' }),
      byErpId,
      byCode,
      new Set(),
    );
    expect(plan).toEqual({
      action: 'update',
      customer: c,
      matchedBy: 'erpId',
    });
  });

  it('falls back to code when erpId missing locally', () => {
    const c = customer({ id: 'a', code: 'C1', erpId: undefined });
    const byErpId = new Map<string, LocalCustomer[]>();
    const byCode = new Map([['C1', [c]]]);
    const plan = planLogoCustomerRowMatch(
      mapped({ erpId: '999', code: 'C1' }),
      byErpId,
      byCode,
      new Set(),
    );
    expect(plan).toEqual({
      action: 'update',
      customer: c,
      matchedBy: 'code',
    });
  });

  it('reports conflict on duplicate local code (no auto-merge)', () => {
    const a = customer({ id: 'a', code: 'DUP', erpId: undefined });
    const b = customer({ id: 'b', code: 'DUP', erpId: undefined });
    const plan = planLogoCustomerRowMatch(
      mapped({ erpId: '1', code: 'DUP' }),
      new Map(),
      new Map([['DUP', [a, b]]]),
      new Set(),
    );
    expect(plan.action).toBe('conflict');
    if (plan.action === 'conflict') {
      expect(plan.conflict.type).toBe('duplicate_local_code');
    }
  });

  it('reports conflict when code fallback erpId mismatches', () => {
    const c = customer({ id: 'a', code: 'C1', erpId: 'OLD' });
    const plan = planLogoCustomerRowMatch(
      mapped({ erpId: 'NEW', code: 'C1' }),
      new Map(),
      new Map([['C1', [c]]]),
      new Set(),
    );
    expect(plan.action).toBe('conflict');
    if (plan.action === 'conflict') {
      expect(plan.conflict.type).toBe('code_fallback_erp_mismatch');
    }
  });

  it('creates when neither erpId nor code matches', () => {
    const plan = planLogoCustomerRowMatch(
      mapped({ erpId: 'X', code: 'NEW' }),
      new Map(),
      new Map(),
      new Set(),
    );
    expect(plan).toEqual({ action: 'create' });
  });

  it('reports duplicate Logo LOGICALREF in same response', () => {
    const seen = new Set(['100']);
    const plan = planLogoCustomerRowMatch(
      mapped({ erpId: '100', code: 'C1' }),
      new Map(),
      new Map(),
      seen,
    );
    expect(plan.action).toBe('conflict');
    if (plan.action === 'conflict') {
      expect(plan.conflict.type).toBe('duplicate_logo_erp_id');
    }
  });
});
