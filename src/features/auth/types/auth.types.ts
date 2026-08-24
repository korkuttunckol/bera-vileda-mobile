import type { UserRole } from '@/shared/types/role.types';

export interface AuthUser {
  uid: string;
  userCode: string;
  displayName: string;
  role: UserRole;
  /** Satış temsilcisinin Logo CLCARD.SPECODE portföyü. */
  salesRepCodes: string[];
  reportingStockAuthorityCode?: string;
  reportingSalesSql?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}
