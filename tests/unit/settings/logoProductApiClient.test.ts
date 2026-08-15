import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLogoStockRows,
  LogoApiError,
} from '@/features/settings/services/logoApiClient';

vi.mock('@/config/env', () => ({
  isLogoApiConfigured: () => true,
  env: { VITE_LOGO_API_URL: 'http://logo.test/stoklar' },
}));

describe('fetchLogoStockRows', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns rows including LOGICALREF', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            LOGICALREF: 100,
            CODE: '869',
            PRODUCERCODE: 'S1',
            NAME: 'N',
            MERKEZ: 5,
          },
        ],
      }),
    );

    const rows = await fetchLogoStockRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].LOGICALREF).toBe(100);
  });

  it('throws on empty array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      }),
    );

    await expect(fetchLogoStockRows()).rejects.toThrow(/boş dizi/);
  });

  it('throws on non-array JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ error: true }),
      }),
    );

    await expect(fetchLogoStockRows()).rejects.toBeInstanceOf(LogoApiError);
  });
});
