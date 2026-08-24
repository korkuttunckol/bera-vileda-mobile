import { describe, expect, it } from 'vitest';
import {
  applyLogoFieldsToCustomer,
  logoFieldsForNewCustomer,
  mapLogoRowToCustomerFields,
} from '@/features/settings/services/logoCustomerMapper';
import type { Customer } from '@/shared/types/customer.types';

function baseCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c1',
    localId: 'c1',
    code: 'OLD',
    name: 'Old Name',
    salesRepId: 'bera-user-uid',
    isActive: true,
    isDeleted: false,
    source: 'excel',
    createdAt: 't0',
    updatedAt: 't0',
    createdBy: 'u',
    updatedBy: 'u',
    version: 1,
    syncStatus: 'synced',
    address: { city: 'Eski', district: 'Eskiİlçe', fullAddress: 'Cadde 1' },
    ...overrides,
  };
}

describe('logoCustomerMapper', () => {
  it('maps LOGICALREF → erpId', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: 1001,
      CODE: 'C120',
      DEFINITION_: 'Acme',
    });
    expect(mapped?.erpId).toBe('1001');
  });

  it('maps CODE → code', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '1001',
      CODE: '  C120  ',
      DEFINITION_: 'Acme',
    });
    expect(mapped?.code).toBe('C120');
  });

  it('maps DEFINITION_ → name', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '1',
      CODE: 'A',
      DEFINITION_: 'Tanım Adı',
      DEFINITION: 'Fallback',
    });
    expect(mapped?.name).toBe('Tanım Adı');
  });

  it('falls back to DEFINITION when DEFINITION_ missing', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '1',
      CODE: 'A',
      DEFINITION: 'Sadece Definition',
    });
    expect(mapped?.name).toBe('Sadece Definition');
  });

  it('maps SPECODE=2217 → logoSalesRepCode=2217', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '1',
      CODE: 'A',
      DEFINITION_: 'N',
      SPECODE: 2217,
    });
    expect(mapped?.logoSalesRepCode).toBe('2217');
  });

  it('does not write SPECODE into salesRepId on apply or create', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '9',
      CODE: 'X',
      DEFINITION_: 'N',
      SPECODE: '2217',
    })!;

    const existing = baseCustomer({ salesRepId: 'bera-user-uid' });
    const updated = applyLogoFieldsToCustomer(existing, mapped, 'now');
    expect(updated.logoSalesRepCode).toBe('2217');
    expect(updated.salesRepId).toBe('bera-user-uid');
    expect(updated.salesRepId).not.toBe('2217');

    const created = logoFieldsForNewCustomer(mapped);
    expect(created.logoSalesRepCode).toBe('2217');
    expect(created.salesRepId).toBe('');
    expect(created.salesRepId).not.toBe('2217');
  });

  it('maps SPECODE2 → specialCode2', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '1',
      CODE: 'A',
      DEFINITION_: 'N',
      SPECODE2: 'SC2',
    });
    expect(mapped?.specialCode2).toBe('SC2');
  });

  it('maps SPECODE5 → logoSpecialCode5', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '1',
      CODE: 'A',
      DEFINITION_: 'N',
      SPECODE5: 'BERA',
    });
    expect(mapped?.logoSpecialCode5).toBe('BERA');
    expect(logoFieldsForNewCustomer(mapped!).logoSpecialCode5).toBe('BERA');
  });

  it('maps CITY → address.city and TOWN → address.district', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '1',
      CODE: 'A',
      DEFINITION_: 'N',
      CITY: 'İstanbul',
      TOWN: 'Kadıköy',
    });
    expect(mapped?.address).toEqual({
      city: 'İstanbul',
      district: 'Kadıköy',
    });
  });

  it('maps Borç / Alacak / Bakiye balance fields', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '1',
      CODE: 'A',
      DEFINITION_: 'N',
      Borç: 1500,
      Alacak: 200,
      Bakiye: 1300,
    });
    expect(mapped?.balanceDebit).toBe(1500);
    expect(mapped?.balanceCredit).toBe(200);
    expect(mapped?.balance).toBe(1300);
  });

  it('maps Logo ACTIVE=0 to active and ACTIVE=1 to passive', () => {
    const active = mapLogoRowToCustomerFields({
      LOGICALREF: '1', CODE: '01001', DEFINITION_: 'Aktif', ACTIVE: 0,
    });
    const passive = mapLogoRowToCustomerFields({
      LOGICALREF: '2', CODE: '01002', DEFINITION_: 'Pasif', ACTIVE: 1,
    });
    expect(active?.isActive).toBe(true);
    expect(passive?.isActive).toBe(false);
    expect(logoFieldsForNewCustomer(passive!).isActive).toBe(false);
  });

  it('applies balance fields onto existing customer', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '55',
      CODE: 'NEWCODE',
      DEFINITION_: 'Yeni Ad',
      Borç: 100,
      Alacak: 0,
      Bakiye: 100,
    })!;

    const updated = applyLogoFieldsToCustomer(
      baseCustomer({ salesRepId: 'keep-me' }),
      mapped,
      't1',
    );

    expect(updated.balanceDebit).toBe(100);
    expect(updated.balanceCredit).toBe(0);
    expect(updated.balance).toBe(100);
  });

  it('returns null when LOGICALREF or CODE missing', () => {
    expect(
      mapLogoRowToCustomerFields({ CODE: 'A', DEFINITION_: 'N' }),
    ).toBeNull();
    expect(
      mapLogoRowToCustomerFields({ LOGICALREF: '1', DEFINITION_: 'N' }),
    ).toBeNull();
  });

  it('preserves fullAddress and salesRepId when applying Logo fields', () => {
    const mapped = mapLogoRowToCustomerFields({
      LOGICALREF: '55',
      CODE: 'NEWCODE',
      DEFINITION_: 'Yeni Ad',
      SPECODE: '2217',
      CITY: 'Ankara',
      TOWN: 'Çankaya',
    })!;

    const updated = applyLogoFieldsToCustomer(
      baseCustomer({ salesRepId: 'keep-me' }),
      mapped,
      't1',
    );

    expect(updated.erpId).toBe('55');
    expect(updated.code).toBe('NEWCODE');
    expect(updated.name).toBe('Yeni Ad');
    expect(updated.logoSalesRepCode).toBe('2217');
    expect(updated.salesRepId).toBe('keep-me');
    expect(updated.address?.city).toBe('Ankara');
    expect(updated.address?.district).toBe('Çankaya');
    expect(updated.address?.fullAddress).toBe('Cadde 1');
  });
});
