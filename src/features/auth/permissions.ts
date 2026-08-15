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

/** Order-capable non-admin set (Merch + Satış Temsilcisi). No scoped MD yet. */
const ORDER_OPERATOR_PERMISSIONS: ReadonlySet<Permission> = new Set([
  PERMISSIONS.pullMasterData,
  PERMISSIONS.createOrder,
  PERMISSIONS.editOrder,
  PERMISSIONS.deleteOrder,
  PERMISSIONS.exportReports,
  PERMISSIONS.offlineWork,
]);

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  [UserRole.ADMIN]: new Set(Object.values(PERMISSIONS)),
  // Foundation: same capability set as Merch until scoped sync lands.
  [UserRole.SALES_REP]: ORDER_OPERATOR_PERMISSIONS,
  [UserRole.MERCH]: ORDER_OPERATOR_PERMISSIONS,
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
