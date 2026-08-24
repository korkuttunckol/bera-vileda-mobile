/**
 * Logo cari hareket (account statement) API client.
 * GET cariHareket.ashx?customerCode=...
 */

import {
  deriveLogoApiSibling,
  env,
  isLogoCariHareketApiConfigured,
} from '@/config/env';
import {
  fetchLogoJsonWithFallback,
  LogoHttpFetchError,
} from '@/features/settings/services/logoApiFetch';

const CARI_HAREKET_ASHX = 'cariHareket.ashx';

export interface LogoCariHareketRow {
  CARI_LOGICALREF?: string | number | null;
  CARI_KOD?: string | number | null;
  CARI_AD?: string | number | null;
  HAREKET_LOGICALREF?: string | number | null;
  TARIH?: string | null;
  SAAT?: string | null;
  FIS_TURU?: string | number | null;
  ISLEM_YONU?: string | number | null;
  ISLEM_NO?: string | number | null;
  BELGE_NO?: string | null;
  ACIKLAMA?: string | null;
  FATURA_LOGICALREF?: string | number | null;
  FATURA_TURU?: string | number | null;
  FATURA_FIS_NO?: string | null;
  FATURA_BELGE_NO?: string | null;
  BANKA_ACIKLAMA?: string | null;
  BANKA_FIS_ACIKLAMA?: string | null;
  BANKA_FIS_NO?: string | null;
  BORC?: string | number | null;
  ALACAK?: string | number | null;
  NET_TUTAR?: string | number | null;
  BAKIYE?: string | number | null;
  [key: string]: unknown;
}

export class LogoCariHareketApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LogoCariHareketApiError';
  }
}

function buildStatementUrl(baseUrl: string, customerCode: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return '';
  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}customerCode=${encodeURIComponent(customerCode)}`;
}

export function resolveCariHareketLanUrl(): string {
  return deriveLogoApiSibling(env.VITE_LOGO_CUSTOMERS_API_URL, CARI_HAREKET_ASHX);
}

export function resolveCariHareketExternalUrl(): string {
  return deriveLogoApiSibling(
    env.VITE_LOGO_CUSTOMERS_API_EXTERNAL_URL,
    CARI_HAREKET_ASHX,
  );
}

export async function fetchLogoCariHareketRows(
  customerCode: string,
  signal?: AbortSignal,
): Promise<LogoCariHareketRow[]> {
  const code = customerCode.trim();
  if (!code) {
    throw new LogoCariHareketApiError('Cari kodu zorunludur.');
  }

  if (!isLogoCariHareketApiConfigured()) {
    throw new LogoCariHareketApiError(
      'Logo cari hareket API URL yapılandırılmamış (VITE_LOGO_CUSTOMERS_API_URL).',
    );
  }

  let data: unknown;
  try {
    const result = await fetchLogoJsonWithFallback({
      channel: 'customers',
      lanUrl: buildStatementUrl(resolveCariHareketLanUrl(), code),
      externalUrl: buildStatementUrl(resolveCariHareketExternalUrl(), code),
      signal,
      networkErrorMessage:
        'Logo cari hareket API erişilemedi. Bağlantınızı kontrol edin.',
      httpErrorMessage: (status) =>
        `Logo cari hareket API hatası (HTTP ${status}).`,
      jsonErrorMessage: 'Logo cari hareket yanıtı JSON olarak okunamadı.',
    });
    data = result.data;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (err instanceof LogoHttpFetchError) {
      throw new LogoCariHareketApiError(err.message, err.statusCode, err.cause);
    }
    throw err;
  }

  if (!Array.isArray(data)) {
    throw new LogoCariHareketApiError(
      'Logo cari hareket yanıtı dizi formatında değil.',
    );
  }

  return data as LogoCariHareketRow[];
}
