import { UserRole, isAdmin } from '@/shared/types/role.types';
import type { AuthUser } from './types/auth.types';

export const PERMISSIONS = {
  manageUsers: 'manageUsers',
  manageCustomers: 'manageCustomers',
  manageProducts: 'manageProducts',
  manageStock: 'manageStock',
  importExcel: 'importExcel',
  systemSettings: 'systemSettings',
  syncManagement: 'syncManagement',
  /** Firestore → device master data pull only (no upload / no outbox). */
  pullMasterData: 'pullMasterData',
  createOrder: 'createOrder',
  editOrder: 'editOrder',
  deleteOrder: 'deleteOrder',
  exportReports: 'exportReports',
  offlineWork: 'offlineWork',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Satış temsilcisi için satış, cari ve stok görüntüleme/işlem seti. */
const ORDER_OPERATOR_PERMISSIONS: ReadonlySet<Permission> = new Set([
  PERMISSIONS.pullMasterData,
  PERMISSIONS.manageCustomers,
  PERMISSIONS.manageProducts,
  PERMISSIONS.createOrder,
  PERMISSIONS.editOrder,
  PERMISSIONS.deleteOrder,
  PERMISSIONS.exportReports,
  PERMISSIONS.offlineWork,
]);

/** Merch için mevcut sınırlı sipariş çalışma seti. */
const MERCH_PERMISSIONS: ReadonlySet<Permission> = new Set([
  PERMISSIONS.pullMasterData,
  PERMISSIONS.createOrder,
  PERMISSIONS.editOrder,
  PERMISSIONS.deleteOrder,
  PERMISSIONS.exportReports,
  PERMISSIONS.offlineWork,
]);

const DEPOT_PERMISSIONS: ReadonlySet<Permission> = new Set([
  PERMISSIONS.pullMasterData,
  PERMISSIONS.manageStock,
  PERMISSIONS.offlineWork,
]);

const PACKAGING_PERMISSIONS: ReadonlySet<Permission> = new Set([
  PERMISSIONS.pullMasterData,
  PERMISSIONS.offlineWork,
]);

const REPORTING_PERMISSIONS: ReadonlySet<Permission> = new Set([
  PERMISSIONS.pullMasterData,
  PERMISSIONS.exportReports,
  PERMISSIONS.offlineWork,
]);

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  [UserRole.ADMIN]: new Set(Object.values(PERMISSIONS)),
  [UserRole.SALES_REP]: ORDER_OPERATOR_PERMISSIONS,
  [UserRole.MERCH]: MERCH_PERMISSIONS,
  [UserRole.DEPOT]: DEPOT_PERMISSIONS,
  [UserRole.PACKAGING]: PACKAGING_PERMISSIONS,
  [UserRole.REPORTING]: REPORTING_PERMISSIONS,
  [UserRole.MANAGEMENT]: REPORTING_PERMISSIONS,
};

export function hasPermission(
  user: AuthUser | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role].has(permission);
}

export function canAccessAdminPanel(user: AuthUser | null | undefined): boolean {
  return isAdmin(user?.role ?? UserRole.MERCH);
}
