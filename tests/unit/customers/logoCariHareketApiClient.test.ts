import { describe, expect, it, vi } from 'vitest';
import { fetchLogoCariHareketRows } from '@/features/customers/services/logoCariHareketApiClient';

vi.mock('@/config/env', () => ({
  env: {
    VITE_LOGO_CUSTOMERS_API_URL: 'http://lan.test/LogoApi/cariler.ashx',
    VITE_LOGO_CUSTOMERS_API_EXTERNAL_URL: '',
  },
  deriveLogoApiSibling: (url: string, ashx: string) => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    const slash = trimmed.lastIndexOf('/');
    return `${trimmed.slice(0, slash + 1)}${ashx}`;
  },
  isLogoCariHareketApiConfigured: () => true,
}));

vi.mock('@/features/settings/services/logoApiFetch', () => ({
  fetchLogoJsonWithFallback: vi.fn(async ({ lanUrl }: { lanUrl: string }) => ({
    data: [{ CARI_KOD: '08171', ACIKLAMA: 'Test' }],
    endpoint: 'lan',
    status: 200,
    requestedUrl: lanUrl,
  })),
  LogoHttpFetchError: class LogoHttpFetchError extends Error {},
}));

describe('fetchLogoCariHareketRows', () => {
  it('requests statement with customerCode query param', async () => {
    const { fetchLogoJsonWithFallback } = await import(
      '@/features/settings/services/logoApiFetch'
    );
    const rows = await fetchLogoCariHareketRows('08171');
    expect(rows).toHaveLength(1);
    expect(fetchLogoJsonWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        lanUrl: 'http://lan.test/LogoApi/cariHareket.ashx?customerCode=08171',
      }),
    );
  });

  it('rejects empty customerCode', async () => {
    await expect(fetchLogoCariHareketRows('  ')).rejects.toThrow(/Cari kodu/);
  });
});
