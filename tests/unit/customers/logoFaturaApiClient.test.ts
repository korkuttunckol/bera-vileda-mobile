import { describe, expect, it, vi } from 'vitest';
import { fetchLogoFatura } from '@/features/customers/services/logoFaturaApiClient';

vi.mock('@/config/env', () => ({
  env: {
    VITE_LOGO_CUSTOMERS_API_URL: 'http://lan.test/LogoApi/cariler.ashx',
    VITE_LOGO_CUSTOMERS_API_EXTERNAL_URL: '',
  },
  deriveLogoApiSibling: (url: string, ashx: string) => {
    const slash = url.lastIndexOf('/');
    return `${url.slice(0, slash + 1)}${ashx}`;
  },
  isLogoCustomersApiConfigured: () => true,
}));

vi.mock('@/features/settings/services/logoApiFetch', () => ({
  fetchLogoJsonWithFallback: vi.fn(async ({ lanUrl }: { lanUrl: string }) => ({
    data: { invoice: { BELGE_NO: 'F-1' }, lines: [] },
    endpoint: 'lan',
    status: 200,
    requestedUrl: lanUrl,
  })),
  LogoHttpFetchError: class LogoHttpFetchError extends Error {},
}));

describe('fetchLogoFatura', () => {
  it('uses the customer-scoped invoice endpoint', async () => {
    const { fetchLogoJsonWithFallback } = await import(
      '@/features/settings/services/logoApiFetch'
    );
    await fetchLogoFatura('08171', 12345);
    expect(fetchLogoJsonWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        lanUrl: 'http://lan.test/LogoApi/fatura.ashx?customerCode=08171&invoiceRef=12345',
      }),
    );
  });
});
