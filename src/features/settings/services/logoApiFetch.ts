/**
 * Logo master-data HTTP helper: always LAN-first with optional external (WAN)
 * fallback only when the LAN endpoint is unreachable (network / timeout).
 *
 * HTTP 4xx/5xx and JSON parse failures do NOT fall back — the reachable
 * endpoint's error is returned immediately.
 */

export type LogoApiChannel = 'stock' | 'customers';
export type LogoEndpointKind = 'lan' | 'external';

/** Default per-attempt timeout so LAN probes do not hang forever off-site. */
export const LOGO_API_ATTEMPT_TIMEOUT_MS = 8_000;

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

/** Always LAN first, then external when configured. No session preference. */
function buildAttempts(lanUrl: string, externalUrl: string): Attempt[] {
  const lan = lanUrl.trim()
    ? ({ url: lanUrl.trim(), endpoint: 'lan' as const } satisfies Attempt)
    : null;
  const external = externalUrl.trim()
    ? ({
        url: externalUrl.trim(),
        endpoint: 'external' as const,
      } satisfies Attempt)
    : null;

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
  /** Retained for caller clarity (stock vs customers); does not affect order. */
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
 * Try LAN then external. External is used only after a network/timeout failure
 * on the previous attempt. HTTP errors and JSON parse errors fail immediately.
 * Does not validate array shape — callers do that.
 */
export async function fetchLogoJsonWithFallback(
  options: FetchLogoJsonWithFallbackOptions,
): Promise<{ data: unknown; endpoint: LogoEndpointKind; status: number }> {
  const attempts = buildAttempts(options.lanUrl, options.externalUrl);

  if (attempts.length === 0) {
    throw new LogoHttpFetchError(options.networkErrorMessage);
  }

  const timeoutMs = options.timeoutMs ?? LOGO_API_ATTEMPT_TIMEOUT_MS;
  let lastNetworkError: LogoHttpFetchError | undefined;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    const hasNext = i < attempts.length - 1;

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
        // Per-attempt timeout → try next endpoint if any.
        lastNetworkError = new LogoHttpFetchError(
          options.networkErrorMessage,
          undefined,
          err,
          'network',
        );
        if (hasNext) continue;
        throw lastNetworkError;
      }
      lastNetworkError = new LogoHttpFetchError(
        options.networkErrorMessage,
        undefined,
        err,
        'network',
      );
      if (hasNext) continue;
      throw lastNetworkError;
    }

    // Reached a server — do not fall back on HTTP status errors.
    if (!response.ok) {
      throw new LogoHttpFetchError(
        options.httpErrorMessage(response.status),
        response.status,
        undefined,
        'http',
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      // Reached a server — do not fall back on JSON parse failure.
      throw new LogoHttpFetchError(
        options.jsonErrorMessage,
        response.status,
        err,
        'json',
      );
    }

    return { data, endpoint: attempt.endpoint, status: response.status };
  }

  throw (
    lastNetworkError ??
    new LogoHttpFetchError(options.networkErrorMessage)
  );
}
