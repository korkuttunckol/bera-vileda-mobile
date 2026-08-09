import { describe, expect, it } from 'vitest';
import {
  getOrderCreatorId,
  resolveOrderCreatorName,
} from '@/features/orders/utils/resolveOrderCreatorName';

describe('resolveOrderCreatorName', () => {
  it('resolves createdBy to AppUser.name', () => {
    const label = resolveOrderCreatorName(
      { createdBy: 'MERCH01', salesRepId: 'MERCH01' },
      { name: 'MEHMET', userCode: 'MERCH01' },
    );
    expect(label).toBe('MEHMET');
  });

  it('falls back to userCode when user has no name', () => {
    const label = resolveOrderCreatorName(
      { createdBy: 'MERCH01', salesRepId: 'MERCH01' },
      { name: '   ', userCode: 'MERCH01' },
    );
    expect(label).toBe('MERCH01');
  });

  it('falls back to createdBy when user is not found', () => {
    const label = resolveOrderCreatorName(
      { createdBy: 'MERCH99', salesRepId: 'MERCH99' },
      undefined,
    );
    expect(label).toBe('MERCH99');
  });

  it('uses salesRepId when createdBy is empty', () => {
    expect(getOrderCreatorId({ createdBy: '', salesRepId: 'MERCH02' })).toBe(
      'MERCH02',
    );
    const label = resolveOrderCreatorName(
      { createdBy: '', salesRepId: 'MERCH02' },
      { name: 'AYŞE', userCode: 'MERCH02' },
    );
    expect(label).toBe('AYŞE');
  });

  it('does not use a session/admin user that is not the lookup result', () => {
    // Simulates Admin session (ADMIN / KORKUT) while order belongs to MERCH01.
    // Resolver only sees the looked-up Merch user (or null) — never session.
    const adminSession = { name: 'KORKUT', userCode: 'ADMIN' };
    const merchLookup = { name: 'MEHMET', userCode: 'MERCH01' };

    const fromMerchLookup = resolveOrderCreatorName(
      { createdBy: 'MERCH01', salesRepId: 'MERCH01' },
      merchLookup,
    );
    expect(fromMerchLookup).toBe('MEHMET');
    expect(fromMerchLookup).not.toBe(adminSession.name);

    const whenLookupMisses = resolveOrderCreatorName(
      { createdBy: 'MERCH01', salesRepId: 'MERCH01' },
      undefined,
    );
    expect(whenLookupMisses).toBe('MERCH01');
    expect(whenLookupMisses).not.toBe(adminSession.name);
    expect(whenLookupMisses).not.toBe(adminSession.userCode);
  });
});
