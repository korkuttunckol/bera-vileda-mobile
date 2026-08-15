import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLogoJsonWithFallback,
  LOGO_API_ATTEMPT_TIMEOUT_MS,
  LogoHttpFetchError,
} from '@/features/settings/services/logoApiFetch';

const LAN = 'http://lan.test/stoklar.ashx';
const EXTERNAL = 'http://wan.test/stoklar.ashx';

const baseOpts = {
  channel: 'stock' as const,
  lanUrl: LAN,
  externalUrl: EXTERNAL,
  networkErrorMessage: 'net',
  httpErrorMessage: (s: number) => `http ${s}`,
  jsonErrorMessage: 'json parse failed',
};

function okJson(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

function httpError(status: number) {
  return {
    ok: false,
    status,
    json: async () => ({}),
  };
}

describe('fetchLogoJsonWithFallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('A) LAN 200 + JSON → external fetch count = 0', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson([{ id: 1 }]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLogoJsonWithFallback(baseOpts);
    expect(result.endpoint).toBe('lan');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(LAN);
  });

  it('B) LAN network error → external is tried', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === LAN) throw new TypeError('Failed to fetch');
      return okJson([{ id: 2 }]);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLogoJsonWithFallback(baseOpts);
    expect(result.endpoint).toBe('external');
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([LAN, EXTERNAL]);
  });

  it('C) LAN timeout → external is tried', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === LAN) {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        });
      }
      return Promise.resolve(okJson([{ ok: true }]));
    });
    vi.stubGlobal('fetch', fetchMock);

    const pending = fetchLogoJsonWithFallback({
      ...baseOpts,
      timeoutMs: LOGO_API_ATTEMPT_TIMEOUT_MS,
    });

    await vi.advanceTimersByTimeAsync(LOGO_API_ATTEMPT_TIMEOUT_MS + 50);
    const result = await pending;

    expect(result.endpoint).toBe('external');
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([LAN, EXTERNAL]);
  });

  it.each([401, 403, 404, 500])(
    'D–G) LAN HTTP %s → external is not tried',
    async (status) => {
      const fetchMock = vi.fn().mockResolvedValue(httpError(status));
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchLogoJsonWithFallback(baseOpts)).rejects.toMatchObject({
        name: 'LogoHttpFetchError',
        statusCode: status,
        kind: 'http',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(LAN);
    },
  );

  it('H) LAN JSON parse error → external is not tried', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLogoJsonWithFallback(baseOpts)).rejects.toMatchObject({
      name: 'LogoHttpFetchError',
      kind: 'json',
      message: 'json parse failed',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(LAN);
  });

  it('I/J) every sync is LAN-first even after prior external success', async () => {
    const fetchMock = vi
      .fn()
      // sync 1: LAN network fail → external OK
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(okJson([{ id: 1 }]))
      // sync 2: must try LAN first again
      .mockResolvedValueOnce(okJson([{ id: 2 }]));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchLogoJsonWithFallback(baseOpts);
    expect(first.endpoint).toBe('external');
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([LAN, EXTERNAL]);

    const second = await fetchLogoJsonWithFallback(baseOpts);
    expect(second.endpoint).toBe('lan');
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      LAN,
      EXTERNAL,
      LAN,
    ]);
  });

  it('K) no external URL → LAN-only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson([{ id: 1 }]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchLogoJsonWithFallback({
      ...baseOpts,
      externalUrl: '',
    });
    expect(result.endpoint).toBe('lan');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('K) no external URL and LAN network fail → single call error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchLogoJsonWithFallback({ ...baseOpts, externalUrl: '' }),
    ).rejects.toBeInstanceOf(LogoHttpFetchError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
