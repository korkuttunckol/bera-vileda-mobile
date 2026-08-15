/**
 * Logo Stok API client
 *
 * Fetches stock/product rows from the Logo endpoint as a JSON array.
 * LAN-first; falls back to external URL when LAN fails.
 * Does not mutate local data — callers decide how to apply results.
 */

import { env, isLogoApiConfigured } from '@/config/env';
import {
  fetchLogoJsonWithFallback,
  LogoHttpFetchError,
} from '@/features/settings/services/logoApiFetch';

/** Raw Logo API row field names (exact API keys). */
export interface LogoStockRow {
  /** LG_002_ITEMS.LOGICALREF — required for Product.erpId / STOCKREF */
  LOGICALREF?: string | number | null;
  CODE?: string | number | null;
  NAME?: string | number | null;
  PRODUCERCODE?: string | number | null;
  STGRPCODE?: string | number | null;
  SPECODE?: string | number | null;
  SPECODE2?: string | number | null;
  VAT?: string | number | null;
  MERKEZ?: string | number | null;
  SATIS_FIYATI?: string | number | null;
  [key: string]: unknown;
}

export class LogoApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'LogoApiError';
  }
}

function toLogoApiError(err: unknown): never {
  if (err instanceof DOMException && err.name === 'AbortError') {
    throw err;
  }
  if (err instanceof LogoHttpFetchError) {
    throw new LogoApiError(err.message, err.statusCode, err.cause);
  }
  throw err;
}

/**
 * Fetch Logo stock rows.
 * Throws LogoApiError on missing config, network, non-OK, empty, or invalid response.
 * Never clears local product data — callers must not wipe IndexedDB on failure.
 */
export async function fetchLogoStockRows(
  signal?: AbortSignal
): Promise<LogoStockRow[]> {
  if (!isLogoApiConfigured()) {
    throw new LogoApiError(
      'Logo API URL yapılandırılmamış (VITE_LOGO_API_URL).'
    );
  }

  let data: unknown;
  let status: number | undefined;

  try {
    const result = await fetchLogoJsonWithFallback({
      channel: 'stock',
      lanUrl: env.VITE_LOGO_API_URL,
      externalUrl: env.VITE_LOGO_API_EXTERNAL_URL,
      signal,
      networkErrorMessage:
        'Logo API erişilemedi. Yerel ürün/stok verileri korunur.',
      httpErrorMessage: (httpStatus) =>
        `Logo API hata döndürdü (HTTP ${httpStatus}). Yerel veriler korunur.`,
      jsonErrorMessage:
        'Logo API yanıtı JSON olarak okunamadı. Yerel veriler korunur.',
    });
    data = result.data;
    status = result.status;
  } catch (err) {
    toLogoApiError(err);
  }

  if (!Array.isArray(data)) {
    throw new LogoApiError(
      'Logo API beklenen dizi formatında veri döndürmedi. Yerel veriler korunur.',
      status
    );
  }

  // Empty array is unsafe / incomplete — do not treat as successful sync.
  if (data.length === 0) {
    throw new LogoApiError(
      'Logo stok API boş dizi döndürdü. Yerel ürünler korunur (pasifleştirme/silme yok).',
      status
    );
  }

  return data as LogoStockRow[];
}
