import { deriveLogoApiSibling, env, isLogoCustomersApiConfigured } from '@/config/env';
import {
  fetchLogoJsonWithFallback,
  LogoHttpFetchError,
} from '@/features/settings/services/logoApiFetch';

const FATURA_ASHX = 'fatura.ashx';

export interface LogoFaturaHeader {
  FATURA_LOGICALREF?: string | number | null;
  FIS_NO?: string | null;
  BELGE_NO?: string | null;
  TARIH?: string | null;
  KDV_ORANI?: string | number | null;
  BRUT_TOPLAM?: string | number | null;
  TOPLAM_ISKONTO?: string | number | null;
  TOPLAM_KDV?: string | number | null;
  GENEL_TOPLAM?: string | number | null;
  ACIKLAMA_1?: string | null;
  ACIKLAMA_2?: string | null;
  CARI_KOD?: string | null;
  CARI_AD?: string | null;
}

export interface LogoFaturaLine {
  SATIR_LOGICALREF?: string | number | null;
  SATIR_NO?: string | number | null;
  URUN_KODU?: string | null;
  URUN_ADI?: string | null;
  MIKTAR?: string | number | null;
  BIRIM_FIYAT?: string | number | null;
  BRUT_TUTAR?: string | number | null;
  ISKONTO?: string | number | null;
  ISKONTO_ORANI?: string | number | null;
  ISKONTO_ORANLARI?: string | null;
  KDV_ORANI?: string | number | null;
  KDV_TUTARI?: string | number | null;
  NET_TUTAR?: string | number | null;
  ACIKLAMA?: string | null;
}

export interface LogoFatura {
  invoice: LogoFaturaHeader;
  lines: LogoFaturaLine[];
}

export class LogoFaturaApiError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'LogoFaturaApiError';
  }
}

function buildUrl(baseUrl: string, customerCode: string, invoiceRef: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return '';
  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}customerCode=${encodeURIComponent(customerCode)}&invoiceRef=${encodeURIComponent(invoiceRef)}`;
}

function resolveLanUrl(): string {
  return deriveLogoApiSibling(env.VITE_LOGO_CUSTOMERS_API_URL, FATURA_ASHX);
}

function resolveExternalUrl(): string {
  return deriveLogoApiSibling(env.VITE_LOGO_CUSTOMERS_API_EXTERNAL_URL, FATURA_ASHX);
}

export async function fetchLogoFatura(
  customerCode: string,
  invoiceRef: string | number,
  signal?: AbortSignal,
): Promise<LogoFatura> {
  const code = customerCode.trim();
  const ref = String(invoiceRef ?? '').trim();
  if (!code || !/^\d+$/.test(ref)) {
    throw new LogoFaturaApiError('Cari kodu ve fatura referansı zorunludur.');
  }
  if (!isLogoCustomersApiConfigured()) {
    throw new LogoFaturaApiError('Logo fatura API yapılandırılmamış.');
  }

  try {
    const { data } = await fetchLogoJsonWithFallback({
      channel: 'customers',
      lanUrl: buildUrl(resolveLanUrl(), code, ref),
      externalUrl: buildUrl(resolveExternalUrl(), code, ref),
      signal,
      networkErrorMessage: 'Logo fatura API erişilemedi. Bağlantınızı kontrol edin.',
      httpErrorMessage: (status) =>
        status === 404 ? 'Satış faturası bulunamadı.' : `Logo fatura API hatası (HTTP ${status}).`,
      jsonErrorMessage: 'Logo fatura yanıtı JSON olarak okunamadı.',
    });
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new LogoFaturaApiError('Logo fatura yanıtı beklenen formatta değil.');
    }
    const result = data as Partial<LogoFatura>;
    if (!result.invoice || !Array.isArray(result.lines)) {
      throw new LogoFaturaApiError('Logo fatura yanıtı eksik.');
    }
    return result as LogoFatura;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    if (err instanceof LogoHttpFetchError) {
      throw new LogoFaturaApiError(err.message, err.statusCode);
    }
    throw err;
  }
}
