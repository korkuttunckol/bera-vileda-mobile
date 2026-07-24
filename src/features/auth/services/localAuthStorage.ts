import type { AuthUser } from '../types/auth.types';
import { parseUserRole } from '@/shared/types/role.types';

const STORAGE_KEY = 'bera-auth-session-v2';

export interface StoredAuthSession {
  uid: string;
  userCode: string;
  displayName: string;
  role: AuthUser['role'];
  loggedInAt: string;
}

export function saveAuthSession(user: AuthUser): void {
  const session: StoredAuthSession = {
    uid: user.uid,
    userCode: user.userCode,
    displayName: user.displayName,
    role: user.role,
    loggedInAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getAuthSession(): StoredAuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    const role = parseUserRole(parsed.role);
    if (!parsed.uid || !parsed.userCode || !role) {
      return null;
    }
    return {
      uid: parsed.uid,
      userCode: parsed.userCode,
      displayName: parsed.displayName ?? parsed.userCode,
      role,
      loggedInAt: parsed.loggedInAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
