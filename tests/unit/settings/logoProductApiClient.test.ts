import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLogoStockRows,
  LogoApiError,
} from '@/features/settings/services/logoApiClient';

const LAN = 'http://lan.test/LogoApi/stoklar.ashx';
const EXTERNAL = 'http://wan.test/LogoApi/stoklar.ashx';

const envState = vi.hoisted(() => ({
  lan: 'http://lan.test/LogoApi/stoklar.ashx',
  external: 'http://wan.test/LogoApi/stoklar.ashx',
}));

vi.mock('@/config/env', () => ({
  isLogoApiConfigured: () =>
    Boolean(envState.lan.trim() || envState.external.trim()),
  env: {
    get VITE_LOGO_API_URL() {
      return envState.lan;
    },
    get VITE_LOGO_API_EXTERNAL_URL() {
      return envState.external;
    },
  },
}));

const sampleRow = {
  LOGICALREF: 100,
  CODE: '869',
  PRODUCERCODE: 'S1',
  NAME: 'N',
  MERKEZ: 5,
};

function okJson(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

describe('fetchLogoStockRows', () => {
  beforeEach(() => {
    envState.lan = LAN;
    envState.external = EXTERNAL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns rows including LOGICALREF', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okJson([sampleRow])),
    );

    const rows = await fetchLogoStockRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].LOGICALREF).toBe(100);
  });

  it('throws on empty array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okJson([])),
    );

    await expect(fetchLogoStockRows()).rejects.toThrow(/boş dizi/);
  });

  it('throws on non-array JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okJson({ error: true })),
    );

    await expect(fetchLogoStockRows()).rejects.toBeInstanceOf(LogoApiError);
  });

  it('A) LAN 200 + JSON → external not called', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === LAN) return okJson([sampleRow]);
      throw new Error(`unexpected URL ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const rows = await fetchLogoStockRows();
    expect(rows).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(LAN);
  });

  it('B) LAN network error → external stock API called and succeeds', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === LAN) throw new TypeError('Failed to fetch');
      if (url === EXTERNAL) return okJson([{ ...sampleRow, LOGICALREF: 200 }]);
      throw new Error(`unexpected URL ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const rows = await fetchLogoStockRows();
    expect(rows[0].LOGICALREF).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([LAN, EXTERNAL]);
  });

  it('LAN HTTP 500 → external not called', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLogoStockRows()).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof LogoApiError && /HTTP 500/.test(err.message),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(LAN);
  });

  it('both network fail → LogoApiError erişilemedi', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLogoStockRows()).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof LogoApiError && /erişilemedi/.test(err.message),
    );
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([LAN, EXTERNAL]);
  });

  it('K) no external URL → LAN-only behaviour unchanged', async () => {
    envState.external = '';
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === LAN) return okJson([sampleRow]);
      throw new Error(`unexpected URL ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const rows = await fetchLogoStockRows();
    expect(rows).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(LAN);
  });

  it('K) no external URL and LAN fails → no second call', async () => {
    envState.external = '';
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLogoStockRows()).rejects.toThrow(/erişilemedi/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
