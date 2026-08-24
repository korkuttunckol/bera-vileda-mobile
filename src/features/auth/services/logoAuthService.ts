import { env } from '@/config/env';
import { parseUserRole } from '@/shared/types/role.types';
import { normalizeUserCode } from '@/shared/types/user.types';
import type { AuthUser } from '../types/auth.types';

export const LOGO_AUTH_ATTEMPT_TIMEOUT_MS = 12_000;

export const INVALID_CREDENTIALS_MESSAGE = 'Kullanıcı kodu veya şifre hatalı';
const GENERIC_LOGIN_ERROR_MESSAGE = 'Giriş işlemi başarısız oldu.';
const SERVER_ERROR_MESSAGE =
  'Kimlik doğrulama sunucusuna ulaşılamadı. Lütfen tekrar deneyin.';
const NETWORK_ERROR_MESSAGE =
  'Kimlik doğrulama sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin.';

export class LogoAuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly kind: 'credentials' | 'validation' | 'server' | 'network' = 'network',
  ) {
    super(message);
    this.name = 'LogoAuthError';
  }
}

export interface LogoAuthSessionExtras {
  token: string;
  expiresAt: string;
}

export interface LogoAuthLoginResult {
  user: AuthUser;
  session: LogoAuthSessionExtras;
}

interface LogoAuthSuccessResponse {
  success: true;
  token: string;
  expiresAt: string;
  user: {
    userCode: string;
    role: string;
  };
}

interface LogoAuthErrorResponse {
  success: false;
  error?: string;
}

function readAuthUrl(): string {
  return env.VITE_LOGO_AUTH_URL.trim();
}

function parseErrorMessage(payload: unknown): string | undefined {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof (payload as LogoAuthErrorResponse).error === 'string'
  ) {
    const message = (payload as LogoAuthErrorResponse).error?.trim();
    return message || undefined;
  }
  return undefined;
}

function toAuthUser(
  userCode: string,
  role: AuthUser['role'],
  displayName?: string,
): AuthUser {
  return {
    uid: userCode,
    userCode,
    displayName: displayName?.trim() || userCode,
    role,
    salesRepCodes: [],
    reportingStockAuthorityCode: undefined,
    reportingSalesSql: undefined,
  };
}

async function postLogoAuth(
  userCode: string,
  password: string,
  signal?: AbortSignal,
): Promise<Response> {
  const url = readAuthUrl();
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) {
    signal.addEventListener('abort', onAbort);
  }
  const timer = setTimeout(() => controller.abort(), LOGO_AUTH_ATTEMPT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userCode, password }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function loginWithLogoApi(
  userCode: string,
  password: string,
  options?: { displayName?: string; signal?: AbortSignal },
): Promise<LogoAuthLoginResult> {
  const authUrl = readAuthUrl();
  if (!authUrl) {
    throw new LogoAuthError(
      'Logo kimlik doğrulama URL yapılandırılmamış.',
      undefined,
      'validation',
    );
  }

  const normalizedCode = normalizeUserCode(userCode);
  if (!normalizedCode || !password) {
    throw new LogoAuthError(INVALID_CREDENTIALS_MESSAGE, 400, 'validation');
  }

  let response: Response;
  try {
    response = await postLogoAuth(normalizedCode, password, options?.signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LogoAuthError(NETWORK_ERROR_MESSAGE, undefined, 'network');
    }
    throw new LogoAuthError(NETWORK_ERROR_MESSAGE, undefined, 'network');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (response.status >= 500) {
      throw new LogoAuthError(SERVER_ERROR_MESSAGE, response.status, 'server');
    }
    throw new LogoAuthError(GENERIC_LOGIN_ERROR_MESSAGE, response.status, 'validation');
  }

  if (response.status === 401) {
    throw new LogoAuthError(INVALID_CREDENTIALS_MESSAGE, 401, 'credentials');
  }

  if (response.status === 400) {
    throw new LogoAuthError(
      parseErrorMessage(payload) ?? GENERIC_LOGIN_ERROR_MESSAGE,
      400,
      'validation',
    );
  }

  if (response.status >= 500) {
    throw new LogoAuthError(
      parseErrorMessage(payload) ?? SERVER_ERROR_MESSAGE,
      response.status,
      'server',
    );
  }

  if (!response.ok) {
    throw new LogoAuthError(
      parseErrorMessage(payload) ?? GENERIC_LOGIN_ERROR_MESSAGE,
      response.status,
      'validation',
    );
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    !('success' in payload) ||
    (payload as LogoAuthSuccessResponse).success !== true
  ) {
    throw new LogoAuthError(GENERIC_LOGIN_ERROR_MESSAGE, response.status, 'validation');
  }

  const successPayload = payload as LogoAuthSuccessResponse;
  const token = successPayload.token?.trim();
  const expiresAt = successPayload.expiresAt?.trim();
  const remoteUserCode = normalizeUserCode(successPayload.user?.userCode ?? '');
  const role = parseUserRole(successPayload.user?.role);

  if (!token || !expiresAt || !remoteUserCode || !role) {
    throw new LogoAuthError(GENERIC_LOGIN_ERROR_MESSAGE, response.status, 'validation');
  }

  return {
    user: toAuthUser(remoteUserCode, role, options?.displayName),
    session: { token, expiresAt },
  };
}

export function isLogoAuthNetworkError(error: unknown): boolean {
  return error instanceof LogoAuthError && error.kind === 'network';
}

export function isLogoAuthCredentialsError(error: unknown): boolean {
  return error instanceof LogoAuthError && error.kind === 'credentials';
}
