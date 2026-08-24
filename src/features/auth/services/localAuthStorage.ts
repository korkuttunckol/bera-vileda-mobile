import type { AuthUser } from '../types/auth.types';
import { parseUserRole } from '@/shared/types/role.types';

const STORAGE_KEY = 'bera-auth-session-v2';

export interface StoredAuthSession {
  uid: string;
  userCode: string;
  displayName: string;
  role: AuthUser['role'];
  salesRepCodes?: string[];
  reportingStockAuthorityCode?: string;
  reportingSalesSql?: string;
  loggedInAt: string;
  token?: string;
  expiresAt?: string;
}

export interface AuthSessionExtras {
  token?: string;
  expiresAt?: string;
}

export function saveAuthSession(
  user: AuthUser,
  extras?: AuthSessionExtras,
): void {
  const session: StoredAuthSession = {
    uid: user.uid,
    userCode: user.userCode,
    displayName: user.displayName,
    role: user.role,
    salesRepCodes: user.salesRepCodes,
    reportingStockAuthorityCode: user.reportingStockAuthorityCode,
    reportingSalesSql: user.reportingSalesSql,
    loggedInAt: new Date().toISOString(),
    ...(extras?.token ? { token: extras.token } : {}),
    ...(extras?.expiresAt ? { expiresAt: extras.expiresAt } : {}),
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
      salesRepCodes: Array.isArray(parsed.salesRepCodes)
        ? parsed.salesRepCodes.filter((code): code is string => typeof code === 'string')
        : [],
      reportingStockAuthorityCode: typeof parsed.reportingStockAuthorityCode === 'string'
        ? parsed.reportingStockAuthorityCode
        : undefined,
      reportingSalesSql: typeof parsed.reportingSalesSql === 'string'
        ? parsed.reportingSalesSql
        : undefined,
      loggedInAt: parsed.loggedInAt ?? new Date().toISOString(),
      token: typeof parsed.token === 'string' ? parsed.token : undefined,
      expiresAt:
        typeof parsed.expiresAt === 'string' ? parsed.expiresAt : undefined,
    };
  } catch {
    return null;
  }
}

export function getStoredAuthToken(): string | null {
  return getAuthSession()?.token ?? null;
}
