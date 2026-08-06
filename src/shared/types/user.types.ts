import type { SyncStatus } from './base.types';
import type { UserRole } from './role.types';

export interface AppUser {
  id: string;
  userCode: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  active: boolean;
  phone?: string;
  email?: string;
  description?: string;
  isDeleted: boolean;
  deletedAt?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppUserPublic {
  id: string;
  userCode: string;
  name: string;
  role: UserRole;
  active: boolean;
  phone?: string;
  email?: string;
  description?: string;
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
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  active?: boolean;
  password?: string;
  phone?: string;
  email?: string;
  description?: string;
}

export type UserActiveFilter = 'all' | 'active' | 'passive';
export type UserRoleFilter = 'all' | 'admin' | 'merch';

export function normalizeUserCode(userCode: string): string {
  return userCode.trim().toUpperCase();
}

export function normalizeAppUser(
  user: Omit<AppUser, 'active' | 'isDeleted' | 'syncStatus'> & {
    active?: boolean;
    isDeleted?: boolean;
    syncStatus?: AppUser['syncStatus'];
  },
): AppUser {
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
    isDeleted: normalized.isDeleted,
    syncStatus: normalized.syncStatus,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
  };
}
