import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function installLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
}

const envState = vi.hoisted(() => ({
  authUrl: 'http://lan.test/LogoApi/auth.ashx',
  appEnv: 'production' as 'development' | 'staging' | 'production',
}));

const logoAuthState = vi.hoisted(() => ({
  shouldThrow: null as Error | null,
  result: {
    user: {
      uid: 'ADMIN',
      userCode: 'ADMIN',
      displayName: 'ADMIN',
      role: 'admin' as const,
    },
    session: {
      token: 'token-abc',
      expiresAt: '2026-08-22T10:00:00Z',
    },
  },
}));

const offlineState = vi.hoisted(() => ({
  cachedUser: {
    id: 'ADMIN',
    userCode: 'ADMIN',
    passwordHash: '$2a$10$hashed',
    name: 'Offline Admin',
    role: 'admin' as const,
    active: true,
    isDeleted: false,
    syncStatus: 'synced' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  devUserUsed: false,
}));

vi.mock('@/config/env', () => ({
  isFirebaseConfigured: () => false,
  isLogoAuthConfigured: () => Boolean(envState.authUrl.trim()),
  env: {
    get VITE_LOGO_AUTH_URL() {
      return envState.authUrl;
    },
    get VITE_APP_ENV() {
      return envState.appEnv;
    },
  },
}));

vi.mock('@/features/auth/services/logoAuthService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/auth/services/logoAuthService')>();
  return {
    ...actual,
    loginWithLogoApi: vi.fn(async () => {
      if (logoAuthState.shouldThrow) {
        throw logoAuthState.shouldThrow;
      }
      return logoAuthState.result;
    }),
  };
});

vi.mock('@/shared/lib/firebase/userFirestoreService', () => ({
  fetchUserByCodeFromFirestore: vi.fn(),
}));

vi.mock('@/shared/lib/indexeddb/repositories/userRepository', () => ({
  userLocalRepository: {
    findByCode: vi.fn(async () => offlineState.cachedUser),
    upsert: vi.fn(),
  },
}));

vi.mock('@/shared/lib/crypto/passwordService', () => ({
  verifyPassword: vi.fn(async () => true),
  hashPassword: vi.fn(async (value: string) => value),
}));

vi.mock('@/features/auth/services/devUsers', () => ({
  findDevUserByCode: vi.fn(async () => {
    offlineState.devUserUsed = true;
    return {
      id: 'ADMIN',
      userCode: 'ADMIN',
      passwordHash: 'dev-hash',
      name: 'Dev Admin',
      role: 'admin' as const,
      active: true,
      isDeleted: false,
      syncStatus: 'synced',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }),
}));

describe('authService.login', () => {
  beforeEach(() => {
    installLocalStorage();
    envState.authUrl = 'http://lan.test/LogoApi/auth.ashx';
    envState.appEnv = 'production';
    logoAuthState.shouldThrow = null;
    offlineState.devUserUsed = false;
    offlineState.cachedUser = {
      id: 'ADMIN',
      userCode: 'ADMIN',
      passwordHash: '$2a$10$hashed',
      name: 'Offline Admin',
      role: 'admin' as const,
      active: true,
      isDeleted: false,
      syncStatus: 'synced',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    localStorage.clear();
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses LogoApi and stores token in session on success', async () => {
    const { UserRole } = await import('@/shared/types/role.types');
    const { authService } = await import('@/features/auth/services/authService');
    const user = await authService.login({
      username: 'ADMIN',
      password: 'secret',
    });

    expect(user.role).toBe(UserRole.ADMIN);
    const session = JSON.parse(
      localStorage.getItem('bera-auth-session-v2') ?? '{}',
    ) as { token?: string; expiresAt?: string; role?: string };
    expect(session.token).toBe('token-abc');
    expect(session.expiresAt).toBe('2026-08-22T10:00:00Z');
    expect(session.role).toBe('admin');
  });

  it('does not fallback on 401 credentials error', async () => {
    const { LogoAuthError, INVALID_CREDENTIALS_MESSAGE } = await import(
      '@/features/auth/services/logoAuthService'
    );
    logoAuthState.shouldThrow = new LogoAuthError(
      INVALID_CREDENTIALS_MESSAGE,
      401,
      'credentials',
    );

    const { authService } = await import('@/features/auth/services/authService');

    await expect(
      authService.login({ username: 'ADMIN', password: 'wrong' }),
    ).rejects.toThrow(INVALID_CREDENTIALS_MESSAGE);
    expect(localStorage.getItem('bera-auth-session-v2')).toBeNull();
  });

  it('falls back to offline login on network failure', async () => {
    const { LogoAuthError } = await import(
      '@/features/auth/services/logoAuthService'
    );
    logoAuthState.shouldThrow = new LogoAuthError(
      'Kimlik doğrulama sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin.',
      undefined,
      'network',
    );

    const { authService } = await import('@/features/auth/services/authService');
    const user = await authService.login({
      username: 'ADMIN',
      password: 'secret',
    });

    expect(user.displayName).toBe('Offline Admin');
    const session = JSON.parse(
      localStorage.getItem('bera-auth-session-v2') ?? '{}',
    ) as { token?: string };
    expect(session.token).toBeUndefined();
  });

  it('does not use devUsers fallback in production', async () => {
    envState.authUrl = '';
    envState.appEnv = 'production';
    offlineState.cachedUser = undefined as never;

    const { userLocalRepository } = await import(
      '@/shared/lib/indexeddb/repositories/userRepository'
    );
    vi.mocked(userLocalRepository.findByCode).mockResolvedValue(undefined);

    const { authService } = await import('@/features/auth/services/authService');

    await expect(
      authService.login({ username: 'ADMIN', password: 'secret' }),
    ).rejects.toThrow();

    expect(offlineState.devUserUsed).toBe(false);
  });
});
