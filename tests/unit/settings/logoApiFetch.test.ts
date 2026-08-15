import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLogoJsonWithFallback,
  getLastSuccessfulLogoEndpointForTests,
  LOGO_API_ATTEMPT_TIMEOUT_MS,
  resetLogoApiEndpointPreferenceForTests,
} from '@/features/settings/services/logoApiFetch';

const LAN = 'http://lan.test/stoklar.ashx';
const EXTERNAL = 'http://wan.test/stoklar.ashx';

function okJson(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

describe('fetchLogoJsonWithFallback', () => {
  beforeEach(() => {
    resetLogoApiEndpointPreferenceForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('remembers successful external endpoint for next attempt order', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('LAN down'))
      .mockResolvedValueOnce(okJson([{ id: 1 }]))
      .mockResolvedValueOnce(okJson([{ id: 2 }]));
    vi.stubGlobal('fetch', fetchMock);

    await fetchLogoJsonWithFallback({
      channel: 'stock',
      lanUrl: LAN,
      externalUrl: EXTERNAL,
      networkErrorMessage: 'net',
      httpErrorMessage: (s) => `http ${s}`,
      jsonErrorMessage: 'json',
    });

    expect(getLastSuccessfulLogoEndpointForTests('stock')).toBe('external');

    await fetchLogoJsonWithFallback({
      channel: 'stock',
      lanUrl: LAN,
      externalUrl: EXTERNAL,
      networkErrorMessage: 'net',
      httpErrorMessage: (s) => `http ${s}`,
      jsonErrorMessage: 'json',
    });

    // Session prefer: external first after prior external success.
    expect(fetchMock.mock.calls[2][0]).toBe(EXTERNAL);
  });

  it('does not hang forever on LAN — timeout then tries external', async () => {
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
      channel: 'stock',
      lanUrl: LAN,
      externalUrl: EXTERNAL,
      timeoutMs: LOGO_API_ATTEMPT_TIMEOUT_MS,
      networkErrorMessage: 'net',
      httpErrorMessage: (s) => `http ${s}`,
      jsonErrorMessage: 'json',
    });

    await vi.advanceTimersByTimeAsync(LOGO_API_ATTEMPT_TIMEOUT_MS + 50);
    const result = await pending;

    expect(result.endpoint).toBe('external');
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([LAN, EXTERNAL]);
  });
});
