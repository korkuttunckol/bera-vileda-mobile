import type { UserRole } from './role.types';

export interface AppUser {
  id: string;
  userCode: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppUserPublic {
  id: string;
  userCode: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  userCode: string;
  password: string;
  name: string;
  role: UserRole;
  active?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  active?: boolean;
  password?: string;
}

export function normalizeUserCode(userCode: string): string {
  return userCode.trim().toUpperCase();
}

export function toPublicUser(user: AppUser): AppUserPublic {
  return {
    id: user.id,
    userCode: user.userCode,
    name: user.name,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
