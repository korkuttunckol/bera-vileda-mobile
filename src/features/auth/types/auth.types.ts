import type { UserRole } from '@/shared/types/role.types';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}
