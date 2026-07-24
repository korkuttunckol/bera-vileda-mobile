import type { UserRole } from '@/shared/types/role.types';

export interface AuthUser {
  uid: string;
  userCode: string;
  displayName: string;
  role: UserRole;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}
