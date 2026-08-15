/**
 * Logo master-data HTTP helper: LAN-first with optional external (WAN) fallback.
 *
 * Session-level preference remembers the last successful endpoint so subsequent
 * syncs in the same runtime can try that endpoint first. App restart → LAN-first.
 * No persistent cache.
 */

export type LogoApiChannel = 'stock' | 'customers';
export type LogoEndpointKind = 'lan' | 'external';

/** Default per-attempt timeout so LAN probes do not hang forever off-site. */
export const LOGO_API_ATTEMPT_TIMEOUT_MS = 8_000;

const lastSuccessfulEndpoint = new Map<LogoApiChannel, LogoEndpointKind>();

/** Test-only: clear session preference between cases. */
export function resetLogoApiEndpointPreferenceForTests(): void {
  lastSuccessfulEndpoint.clear();
}

export function getLastSuccessfulLogoEndpointForTests(
  channel: LogoApiChannel,
): LogoEndpointKind | undefined {
  return lastSuccessfulEndpoint.get(channel);
}

export class LogoHttpFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
    public readonly kind: 'network' | 'http' | 'json' = 'network',
  ) {
    super(message);
    this.name = 'LogoHttpFetchError';
  }
}

type Attempt = { url: string; endpoint: LogoEndpointKind };

function buildAttempts(
  channel: LogoApiChannel,
  lanUrl: string,
  externalUrl: string,
): Attempt[] {
  const lan = lanUrl.trim()
    ? ({ url: lanUrl.trim(), endpoint: 'lan' as const } satisfies Attempt)
    : null;
  const external = externalUrl.trim()
    ? ({
        url: externalUrl.trim(),
        endpoint: 'external' as const,
      } satisfies Attempt)
    : null;

  const preferred = lastSuccessfulEndpoint.get(channel);
  if (preferred === 'external' && external && lan) {
    return [external, lan];
  }

  // Default / restart: LAN-first when both are set.
  return [lan, external].filter((a): a is Attempt => a !== null);
}

function isUserAbort(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

/**
 * Fetch one URL with a timeout, while still honouring an optional caller AbortSignal.
 * Timeout aborts only this attempt (caller abort stops the whole fallback chain).
 */
async function fetchOnce(
  url: string,
  userSignal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<Response> {
  if (isUserAbort(userSignal)) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const controller = new AbortController();
  const onUserAbort = () => controller.abort();
  if (userSignal) {
    userSignal.addEventListener('abort', onUserAbort);
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    userSignal?.removeEventListener('abort', onUserAbort);
  }
}

export interface FetchLogoJsonWithFallbackOptions {
  channel: LogoApiChannel;
  lanUrl: string;
  externalUrl: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** User-facing message when no endpoint can be reached. */
  networkErrorMessage: string;
  httpErrorMessage: (status: number) => string;
  jsonErrorMessage: string;
}

/**
 * Try LAN then external (or session-preferred order). Returns parsed JSON body on
 * first HTTP OK. Does not validate array shape — callers do that.
 */
export async function fetchLogoJsonWithFallback(
  options: FetchLogoJsonWithFallbackOptions,
): Promise<{ data: unknown; endpoint: LogoEndpointKind; status: number }> {
  const attempts = buildAttempts(
    options.channel,
    options.lanUrl,
    options.externalUrl,
  );

  if (attempts.length === 0) {
    throw new LogoHttpFetchError(options.networkErrorMessage);
  }

  const timeoutMs = options.timeoutMs ?? LOGO_API_ATTEMPT_TIMEOUT_MS;
  let lastError: LogoHttpFetchError | undefined;

  for (const attempt of attempts) {
    if (isUserAbort(options.signal)) {
      throw new DOMException('Aborted', 'AbortError');
    }

    let response: Response;
    try {
      response = await fetchOnce(attempt.url, options.signal, timeoutMs);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (isUserAbort(options.signal)) {
          throw err;
        }
        // Per-attempt timeout (or network abort) → try next endpoint.
        lastError = new LogoHttpFetchError(
          options.networkErrorMessage,
          undefined,
          err,
          'network',
        );
        continue;
      }
      lastError = new LogoHttpFetchError(
        options.networkErrorMessage,
        undefined,
        err,
        'network',
      );
      continue;
    }

    if (!response.ok) {
      lastError = new LogoHttpFetchError(
        options.httpErrorMessage(response.status),
        response.status,
        undefined,
        'http',
      );
      continue;
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      // Reached a server but body is not JSON — do not silently try the other URL
      // as a different parse failure; still allow fallback so WAN can succeed if
      // LAN returned a non-JSON error page.
      lastError = new LogoHttpFetchError(
        options.jsonErrorMessage,
        response.status,
        err,
        'json',
      );
      continue;
    }

    // Only prefer an endpoint after a non-empty JSON array (usable master data).
    if (Array.isArray(data) && data.length > 0) {
      lastSuccessfulEndpoint.set(options.channel, attempt.endpoint);
    }
    return { data, endpoint: attempt.endpoint, status: response.status };
  }

  throw (
    lastError ??
    new LogoHttpFetchError(options.networkErrorMessage)
  );
}
