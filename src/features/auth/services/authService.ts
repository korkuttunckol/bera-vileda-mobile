import { UserRole } from '@/shared/types/role.types';
import type { AuthUser, LoginCredentials } from '../types/auth.types';
import {
  clearLocalSession,
  getLocalSession,
  saveLocalSession,
} from './localAuthStorage';

const VALID_USERNAME = 'admin';
const VALID_PASSWORD = '123456';
const INVALID_CREDENTIALS_MESSAGE = 'Kullanıcı adı veya şifre hatalı';

function createAuthUser(username: string): AuthUser {
  return {
    uid: 'local-admin',
    email: `${username}@bera.local`,
    displayName: username,
    role: UserRole.ADMIN,
  };
}

class AuthService {
  login(credentials: LoginCredentials): AuthUser {
    const username = credentials.username.trim();
    const password = credentials.password;

    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
      throw new Error(INVALID_CREDENTIALS_MESSAGE);
    }

    saveLocalSession(username);
    return createAuthUser(username);
  }

  logout(): void {
    clearLocalSession();
  }

  getCurrentUser(): AuthUser | null {
    const session = getLocalSession();
    if (!session) {
      return null;
    }

    return createAuthUser(session.username);
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    callback(this.getCurrentUser());
    return () => undefined;
  }
}

export const authService = new AuthService();
