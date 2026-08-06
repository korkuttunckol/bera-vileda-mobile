import { isFirebaseConfigured } from '@/config/env';
import { verifyPassword } from '@/shared/lib/crypto/passwordService';
import {
  fetchUserByCodeFromFirestore,
} from '@/shared/lib/firebase/userFirestoreService';
import { userLocalRepository } from '@/shared/lib/indexeddb/repositories/userRepository';
import { UserRole } from '@/shared/types/role.types';
import type { AppUser } from '@/shared/types/user.types';
import { normalizeUserCode } from '@/shared/types/user.types';
import type { AuthUser, LoginCredentials } from '../types/auth.types';
import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
} from './localAuthStorage';
import { findDevUserByCode } from './devUsers';

const INVALID_CREDENTIALS_MESSAGE = 'Kullanıcı kodu veya şifre hatalı';
const INACTIVE_USER_MESSAGE = 'Kullanıcı hesabı pasif durumdadır.';
const OFFLINE_LOGIN_MESSAGE =
  'İnternet bağlantısı yok. Daha önce giriş yapmış bir kullanıcı ile tekrar deneyin.';

function isFirestoreOfflineError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('offline') ||
    message.includes('client is offline') ||
    message.includes('failed to get document')
  );
}

function toAuthUser(user: AppUser): AuthUser {
  return {
    uid: user.id,
    userCode: user.userCode,
    displayName: user.name,
    role: user.role,
  };
}

async function resolveUserRecord(userCode: string): Promise<AppUser | null> {
  const normalizedCode = normalizeUserCode(userCode);

  if (navigator.onLine && isFirebaseConfigured()) {
    try {
      const remoteUser = await fetchUserByCodeFromFirestore(normalizedCode);
      if (remoteUser) {
        await userLocalRepository.upsert(remoteUser);
        return remoteUser;
      }
    } catch (error) {
      if (!isFirestoreOfflineError(error)) {
        console.warn('Firestore kullanıcı sorgusu başarısız, yerel yedek deneniyor.', error);
      }
    }
  }

  const cachedUser = await userLocalRepository.findByCode(normalizedCode);
  if (cachedUser) {
    return cachedUser;
  }

  return findDevUserByCode(normalizedCode);
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const userCode = normalizeUserCode(credentials.username);
    const password = credentials.password;

    if (!userCode || !password) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = await resolveUserRecord(userCode);
    if (!user) {
      throw new Error(
        navigator.onLine ? INVALID_CREDENTIALS_MESSAGE : OFFLINE_LOGIN_MESSAGE,
      );
    }

    if (!user.active || user.isDeleted) {
      throw new Error(INACTIVE_USER_MESSAGE);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    const authUser = toAuthUser(user);
    saveAuthSession(authUser);
    return authUser;
  }

  logout(): void {
    clearAuthSession();
  }

  getCurrentUser(): AuthUser | null {
    const session = getAuthSession();
    if (!session) return null;

    return {
      uid: session.uid,
      userCode: session.userCode,
      displayName: session.displayName,
      role: session.role,
    };
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    callback(this.getCurrentUser());
    return () => undefined;
  }
}

export const authService = new AuthService();

export function isAdminUser(user: AuthUser | null): boolean {
  return user?.role === UserRole.ADMIN;
}
