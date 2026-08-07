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

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  [UserRole.ADMIN]: new Set(Object.values(PERMISSIONS)),
  [UserRole.MERCH]: new Set([
    PERMISSIONS.pullMasterData,
    PERMISSIONS.createOrder,
    PERMISSIONS.editOrder,
    PERMISSIONS.deleteOrder,
    PERMISSIONS.exportReports,
    PERMISSIONS.offlineWork,
  ]),
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
