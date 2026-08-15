import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLogoCustomerRows,
  LogoCustomerApiError,
} from '@/features/settings/services/logoCustomerApiClient';
import { resetLogoApiEndpointPreferenceForTests } from '@/features/settings/services/logoApiFetch';

const LAN = 'http://lan.test/LogoApi/cariler.ashx';
const EXTERNAL = 'http://wan.test/LogoApi/cariler.ashx';

const envState = vi.hoisted(() => ({
  lan: 'http://lan.test/LogoApi/cariler.ashx',
  external: 'http://wan.test/LogoApi/cariler.ashx',
}));

vi.mock('@/config/env', () => ({
  isLogoCustomersApiConfigured: () =>
    Boolean(envState.lan.trim() || envState.external.trim()),
  env: {
    get VITE_LOGO_CUSTOMERS_API_URL() {
      return envState.lan;
    },
    get VITE_LOGO_CUSTOMERS_API_EXTERNAL_URL() {
      return envState.external;
    },
  },
}));

const sampleRow = {
  LOGICALREF: 1,
  CODE: 'A',
  DEFINITION_: 'N',
  SPECODE: '2217',
};

function okJson(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

describe('fetchLogoCustomerRows', () => {
  beforeEach(() => {
    envState.lan = LAN;
    envState.external = EXTERNAL;
    resetLogoApiEndpointPreferenceForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns rows for a valid non-empty JSON array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okJson([sampleRow])),
    );

    const rows = await fetchLogoCustomerRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].SPECODE).toBe('2217');
  });

  it('throws on HTTP error without touching callers locals', async () => {
    envState.external = '';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );

    await expect(fetchLogoCustomerRows()).rejects.toBeInstanceOf(
      LogoCustomerApiError,
    );
  });

  it('throws on empty array (unsafe incomplete response)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okJson([])),
    );

    await expect(fetchLogoCustomerRows()).rejects.toThrow(/boş dizi/);
  });

  it('throws when response is not a JSON array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okJson({ error: 'nope' })),
    );

    await expect(fetchLogoCustomerRows()).rejects.toThrow(/dizi formatında/);
  });

  it('throws when JSON parse fails', async () => {
    envState.external = '';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('bad json');
        },
      }),
    );

    await expect(fetchLogoCustomerRows()).rejects.toThrow(/JSON/);
  });

  it('C) LAN success → external is not called', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === LAN) return okJson([sampleRow]);
      throw new Error(`unexpected URL ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const rows = await fetchLogoCustomerRows();
    expect(rows).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(LAN);
  });

  it('D) LAN fail → external cari API called and succeeds', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === LAN) throw new TypeError('Failed to fetch');
      if (url === EXTERNAL) {
        return okJson([{ ...sampleRow, SPECODE: '9999' }]);
      }
      throw new Error(`unexpected URL ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const rows = await fetchLogoCustomerRows();
    expect(rows[0].SPECODE).toBe('9999');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([LAN, EXTERNAL]);
  });

  it('E) LAN + external both fail → preserves error behaviour', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLogoCustomerRows()).rejects.toBeInstanceOf(
      LogoCustomerApiError,
    );
    await expect(fetchLogoCustomerRows()).rejects.toThrow(/HTTP 502/);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('F) no external URL → LAN-only behaviour unchanged', async () => {
    envState.external = '';
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === LAN) return okJson([sampleRow]);
      throw new Error(`unexpected URL ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const rows = await fetchLogoCustomerRows();
    expect(rows).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
