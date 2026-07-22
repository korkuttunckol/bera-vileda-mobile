import { UserRole } from '@/shared/types/role.types';
import type { AuthUser, LoginCredentials } from '../types/auth.types';

const DEV_SESSION_KEY = 'bera-vileda:dev-auth-disabled';

export function createDevAuthUser(credentials?: LoginCredentials): AuthUser {
  const email = credentials?.email.trim() || 'dev@bera.local';
  const localPart = email.split('@')[0] ?? 'dev';

  return {
    uid: 'dev-local-user',
    email,
    displayName: localPart || 'Geliştirme Kullanıcısı',
    role: UserRole.ADMIN,
  };
}

export function isDevAuthSessionDisabled(): boolean {
  return sessionStorage.getItem(DEV_SESSION_KEY) === 'true';
}

export function disableDevAuthSession(): void {
  sessionStorage.setItem(DEV_SESSION_KEY, 'true');
}

export function enableDevAuthSession(): void {
  sessionStorage.removeItem(DEV_SESSION_KEY);
}

export function getDevAuthUser(): AuthUser | null {
  if (isDevAuthSessionDisabled()) return null;
  return createDevAuthUser();
}
