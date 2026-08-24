import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INVALID_CREDENTIALS_MESSAGE,
  loginWithLogoApi,
  LogoAuthError,
} from '@/features/auth/services/logoAuthService';

const envState = vi.hoisted(() => ({
  authUrl: 'http://lan.test/LogoApi/auth.ashx',
}));

vi.mock('@/config/env', () => ({
  env: {
    get VITE_LOGO_AUTH_URL() {
      return envState.authUrl;
    },
  },
}));

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('loginWithLogoApi', () => {
  const AUTH_URL = 'http://lan.test/LogoApi/auth.ashx';

  beforeEach(() => {
    envState.authUrl = AUTH_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns AuthUser and session on 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          success: true,
          token: 'token-abc',
          expiresAt: '2026-08-22T10:00:00Z',
          user: { userCode: 'ADMIN', role: 'admin' },
        }),
      ),
    );

    const result = await loginWithLogoApi('admin', 'secret', {
      displayName: 'Sistem Yöneticisi',
    });

    expect(result.user).toEqual({
      uid: 'ADMIN',
      userCode: 'ADMIN',
      displayName: 'Sistem Yöneticisi',
      role: 'admin',
      salesRepCodes: [],
    });
    expect(result.session).toEqual({
      token: 'token-abc',
      expiresAt: '2026-08-22T10:00:00Z',
    });
    expect(fetch).toHaveBeenCalledWith(
      AUTH_URL,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userCode: 'ADMIN', password: 'secret' }),
      }),
    );
  });

  it('throws credentials error on 401 without fallback signal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(401, {
          success: false,
          error: INVALID_CREDENTIALS_MESSAGE,
        }),
      ),
    );

    await expect(loginWithLogoApi('ADMIN', 'wrong')).rejects.toMatchObject({
      message: INVALID_CREDENTIALS_MESSAGE,
      statusCode: 401,
      kind: 'credentials',
    });
  });

  it('throws validation error on 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          success: false,
          error: 'userCode ve password zorunludur.',
        }),
      ),
    );

    await expect(loginWithLogoApi('ADMIN', 'secret')).rejects.toMatchObject({
      message: 'userCode ve password zorunludur.',
      statusCode: 400,
      kind: 'validation',
    });
  });

  it('throws server error on 500', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(500, {
          success: false,
          error: 'Firestore kullanıcı kaydı okunamadı.',
        }),
      ),
    );

    await expect(loginWithLogoApi('ADMIN', 'secret')).rejects.toMatchObject({
      statusCode: 500,
      kind: 'server',
    });
  });

  it('throws validation error on invalid role', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          success: true,
          token: 'token-abc',
          expiresAt: '2026-08-22T10:00:00Z',
          user: { userCode: 'ADMIN', role: 'unknown' },
        }),
      ),
    );

    await expect(loginWithLogoApi('ADMIN', 'secret')).rejects.toBeInstanceOf(
      LogoAuthError,
    );
  });

  it('throws network error on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(loginWithLogoApi('ADMIN', 'secret')).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('throws network error on timeout abort', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }),
    );

    const promise = loginWithLogoApi('ADMIN', 'secret');
    const assertion = expect(promise).rejects.toMatchObject({
      kind: 'network',
    });
    await vi.advanceTimersByTimeAsync(12_001);
    await assertion;
    vi.useRealTimers();
  });
});
