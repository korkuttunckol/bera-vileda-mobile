import { describe, expect, it } from 'vitest';
import {
  parseUserRole,
  UserRole,
  USER_ROLE_LABELS,
  isAdmin,
  isMerch,
  isSalesRep,
} from '@/shared/types/role.types';
import {
  CUSTOMER_FIELD_MASK_KEYS,
  PRODUCT_FIELD_MASK_KEYS,
  REQUIRED_CUSTOMER_FIELD_MASK_KEYS,
  REQUIRED_PRODUCT_FIELD_MASK_KEYS,
} from '@/shared/types/userPermission.types';
import {
  assertValidMerchCustomerPatterns,
  isValidMerchCustomerPrefixPattern,
  normalizeMerchCustomerCodes,
  normalizeMerchCustomerPatterns,
  normalizeMerchStockGroupCodes,
  normalizeSalesRepCodes,
  normalizeStringList,
  normalizeUserPermissionProfile,
} from '@/shared/lib/permissions/userPermissionNormalize';
import { hasPermission, PERMISSIONS } from '@/features/auth/permissions';
import type { AuthUser } from '@/features/auth/types/auth.types';

describe('UserRole foundation (3 roles)', () => {
  it('1) accepts admin, salesRep, merch', () => {
    expect(parseUserRole('admin')).toBe(UserRole.ADMIN);
    expect(parseUserRole('salesRep')).toBe(UserRole.SALES_REP);
    expect(parseUserRole('merch')).toBe(UserRole.MERCH);
    expect(USER_ROLE_LABELS[UserRole.ADMIN]).toBe('Admin');
    expect(USER_ROLE_LABELS[UserRole.SALES_REP]).toBe('Satış Temsilcisi');
    expect(USER_ROLE_LABELS[UserRole.MERCH]).toBe('Merch');
    expect(isAdmin(UserRole.ADMIN)).toBe(true);
    expect(isSalesRep(UserRole.SALES_REP)).toBe(true);
    expect(isMerch(UserRole.MERCH)).toBe(true);
  });

  it('2) rejects invalid roles', () => {
    expect(parseUserRole('sales')).toBeNull();
    expect(parseUserRole('SATIS')).toBeNull();
    expect(parseUserRole('')).toBeNull();
    expect(parseUserRole(null)).toBeNull();
    expect(parseUserRole(undefined)).toBeNull();
    expect(parseUserRole(1)).toBeNull();
  });
});

describe('permission list normalization', () => {
  it('3) normalizes salesRepCodes (trim, drop empty, dedupe; preserves case)', () => {
    expect(normalizeSalesRepCodes([' 125 ', '', '125', '130', ' 130 '])).toEqual([
      '125',
      '130',
    ]);
    // Case preserved — no forced upper/lower (Logo CODE mapper trims only).
    expect(normalizeSalesRepCodes(['AbC', 'abc'])).toEqual(['AbC', 'abc']);
  });

  it('4) normalizes merchCustomerCodes', () => {
    expect(
      normalizeMerchCustomerCodes([' 15001 ', '15001', '', '15027']),
    ).toEqual(['15001', '15027']);
  });

  it('5) merchCustomerPatterns: PREFIX* only', () => {
    expect(isValidMerchCustomerPrefixPattern('08*')).toBe(true);
    expect(isValidMerchCustomerPrefixPattern('10*')).toBe(true);
    expect(isValidMerchCustomerPrefixPattern('*08')).toBe(false);
    expect(isValidMerchCustomerPrefixPattern('0*8')).toBe(false);
    expect(isValidMerchCustomerPrefixPattern('')).toBe(false);
    expect(isValidMerchCustomerPrefixPattern('*')).toBe(false);
    expect(isValidMerchCustomerPrefixPattern('08')).toBe(false);
    expect(isValidMerchCustomerPrefixPattern('08**')).toBe(false);

    const { patterns, rejected } = normalizeMerchCustomerPatterns([
      '08*',
      '10*',
      '*08',
      '0*8',
      '',
      '08*',
    ]);
    expect(patterns).toEqual(['08*', '10*']);
    expect(rejected).toEqual(['*08', '0*8']);

    expect(() =>
      assertValidMerchCustomerPatterns(['08*', '*08']),
    ).toThrow(/Geçersiz Merch cari pattern/);
  });

  it('6) normalizes merchStockGroupCodes', () => {
    expect(normalizeMerchStockGroupCodes(['01', ' 03 ', '01', ''])).toEqual([
      '01',
      '03',
    ]);
  });

  it('7) duplicate values are removed (stable first-wins)', () => {
    expect(normalizeStringList(['a', 'b', 'a', 'b', 'c'])).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('8) field mask arrays are type-safe allow-list keys', () => {
    expect(CUSTOMER_FIELD_MASK_KEYS).toContain('code');
    expect(CUSTOMER_FIELD_MASK_KEYS).toContain('logoSalesRepCode');
    expect(PRODUCT_FIELD_MASK_KEYS).toContain('groupCode');
    expect(PRODUCT_FIELD_MASK_KEYS).toContain('barcode');
    expect([...REQUIRED_CUSTOMER_FIELD_MASK_KEYS]).toEqual(
      expect.arrayContaining(['id', 'code', 'name']),
    );
    expect([...REQUIRED_PRODUCT_FIELD_MASK_KEYS]).toEqual(
      expect.arrayContaining(['id', 'barcode', 'name']),
    );

    const profile = normalizeUserPermissionProfile({
      customerFieldMask: ['code', ' name ', 'code', ''],
      productFieldMask: ['barcode', 'stockQuantity'],
    });
    expect(profile.customerFieldMask).toEqual(['code', 'name']);
    expect(profile.productFieldMask).toEqual(['barcode', 'stockQuantity']);
  });
});

describe('existing role permission behaviour (foundation)', () => {
  const admin: AuthUser = {
    uid: 'ADMIN',
    userCode: 'ADMIN',
    displayName: 'Admin',
    role: UserRole.ADMIN,
  };
  const merch: AuthUser = {
    uid: 'M1',
    userCode: 'M1',
    displayName: 'Merch',
    role: UserRole.MERCH,
  };
  const salesRep: AuthUser = {
    uid: 'S1',
    userCode: 'S1',
    displayName: 'SR',
    role: UserRole.SALES_REP,
  };

  it('9) Admin keeps full permissions', () => {
    expect(hasPermission(admin, PERMISSIONS.manageUsers)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.syncManagement)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.createOrder)).toBe(true);
  });

  it('10) Merch keeps order/pull permissions; no manageUsers', () => {
    expect(hasPermission(merch, PERMISSIONS.createOrder)).toBe(true);
    expect(hasPermission(merch, PERMISSIONS.pullMasterData)).toBe(true);
    expect(hasPermission(merch, PERMISSIONS.manageUsers)).toBe(false);
    expect(hasPermission(merch, PERMISSIONS.syncManagement)).toBe(false);
  });

  it('salesRep foundation mirrors Merch capability set (no scoped MD yet)', () => {
    expect(hasPermission(salesRep, PERMISSIONS.createOrder)).toBe(true);
    expect(hasPermission(salesRep, PERMISSIONS.manageUsers)).toBe(false);
  });
});
