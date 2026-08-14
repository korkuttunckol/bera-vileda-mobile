import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchLogoCustomerRows,
  LogoCustomerApiError,
} from '@/features/settings/services/logoCustomerApiClient';

vi.mock('@/config/env', () => ({
  isLogoCustomersApiConfigured: () => true,
  env: { VITE_LOGO_CUSTOMERS_API_URL: 'http://logo.test/cariler' },
}));

describe('fetchLogoCustomerRows', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns rows for a valid non-empty JSON array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { LOGICALREF: 1, CODE: 'A', DEFINITION_: 'N', SPECODE: '2217' },
        ],
      }),
    );

    const rows = await fetchLogoCustomerRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].SPECODE).toBe('2217');
  });

  it('throws on HTTP error without touching callers locals', async () => {
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
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      }),
    );

    await expect(fetchLogoCustomerRows()).rejects.toThrow(/boş dizi/);
  });

  it('throws when response is not a JSON array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ error: 'nope' }),
      }),
    );

    await expect(fetchLogoCustomerRows()).rejects.toThrow(/dizi formatında/);
  });

  it('throws when JSON parse fails', async () => {
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
});
