import type { SyncStatus } from './base.types';
import type { UserRole } from './role.types';
import type { UserPermissionProfile } from './userPermission.types';
import { normalizeUserPermissionProfile } from '@/shared/lib/permissions/userPermissionNormalize';

export interface AppUser extends UserPermissionProfile {
  id: string;
  userCode: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  active: boolean;
  phone?: string;
  email?: string;
  description?: string;
  /** Raporlama kullanıcısının Logo ITEMS.SPECODE stok filtresi. */
  reportingStockAuthorityCode?: string;
  /** ADMIN tarafından tanımlanan, tarih parametreli satış raporu SQL'i. */
  reportingSalesSql?: string;
  isDeleted: boolean;
  deletedAt?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppUserPublic extends UserPermissionProfile {
  id: string;
  userCode: string;
  name: string;
  role: UserRole;
  active: boolean;
  phone?: string;
  email?: string;
  description?: string;
  reportingStockAuthorityCode?: string;
  reportingSalesSql?: string;
  isDeleted: boolean;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  userCode: string;
  password: string;
  name: string;
  role: UserRole;
  active?: boolean;
  phone?: string;
  email?: string;
  description?: string;
  reportingStockAuthorityCode?: string;
  reportingSalesSql?: string;
  salesRepCodes?: string[];
  merchCustomerPatterns?: string[];
  merchCustomerCodes?: string[];
  merchStockGroupCodes?: string[];
  customerFieldMask?: string[];
  productFieldMask?: string[];
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  active?: boolean;
  password?: string;
  phone?: string;
  email?: string;
  description?: string;
  reportingStockAuthorityCode?: string;
  reportingSalesSql?: string;
  salesRepCodes?: string[];
  merchCustomerPatterns?: string[];
  merchCustomerCodes?: string[];
  merchStockGroupCodes?: string[];
  customerFieldMask?: string[];
  productFieldMask?: string[];
}

export type UserActiveFilter = 'all' | 'active' | 'passive';
export type UserRoleFilter =
  | 'all'
  | 'admin'
  | 'salesRep'
  | 'merch'
  | 'depot'
  | 'packaging'
  | 'reporting'
  | 'management';

export function normalizeUserCode(userCode: string): string {
  return userCode.trim().toUpperCase();
}

export function normalizeAppUser(
  user: Omit<
    AppUser,
    | 'active'
    | 'isDeleted'
    | 'syncStatus'
    | 'salesRepCodes'
    | 'merchCustomerPatterns'
    | 'merchCustomerCodes'
    | 'merchStockGroupCodes'
    | 'customerFieldMask'
    | 'productFieldMask'
  > & {
    active?: boolean;
    isDeleted?: boolean;
    syncStatus?: AppUser['syncStatus'];
    salesRepCodes?: string[];
    merchCustomerPatterns?: string[];
    merchCustomerCodes?: string[];
    merchStockGroupCodes?: string[];
    customerFieldMask?: string[];
    productFieldMask?: string[];
    reportingStockAuthorityCode?: string;
    reportingSalesSql?: string;
  },
): AppUser {
  const profile = normalizeUserPermissionProfile(user);
  return {
    ...user,
    userCode: normalizeUserCode(user.userCode),
    id: normalizeUserCode(user.id || user.userCode),
    active: user.active !== false,
    isDeleted: user.isDeleted === true,
    syncStatus: user.syncStatus ?? 'synced',
    phone: user.phone?.trim() || undefined,
    email: user.email?.trim() || undefined,
    description: user.description?.trim() || undefined,
    reportingStockAuthorityCode: user.reportingStockAuthorityCode?.trim() || undefined,
    reportingSalesSql: user.reportingSalesSql?.trim() || undefined,
    ...profile,
  };
}

export function toPublicUser(user: AppUser): AppUserPublic {
  const normalized = normalizeAppUser(user);
  return {
    id: normalized.id,
    userCode: normalized.userCode,
    name: normalized.name,
    role: normalized.role,
    active: normalized.active,
    phone: normalized.phone,
    email: normalized.email,
    description: normalized.description,
    reportingStockAuthorityCode: normalized.reportingStockAuthorityCode,
    reportingSalesSql: normalized.reportingSalesSql,
    isDeleted: normalized.isDeleted,
    syncStatus: normalized.syncStatus,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    salesRepCodes: normalized.salesRepCodes,
    merchCustomerPatterns: normalized.merchCustomerPatterns,
    merchCustomerCodes: normalized.merchCustomerCodes,
    merchStockGroupCodes: normalized.merchStockGroupCodes,
    customerFieldMask: normalized.customerFieldMask,
    productFieldMask: normalized.productFieldMask,
  };
}
