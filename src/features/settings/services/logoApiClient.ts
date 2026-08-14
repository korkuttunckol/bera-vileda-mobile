/**
 * Logo Stok API client
 *
 * Fetches stock/product rows from the Logo endpoint as a JSON array.
 * Does not mutate local data — callers decide how to apply results.
 */

import { env, isLogoApiConfigured } from '@/config/env';

/** Raw Logo API row field names (exact API keys). */
export interface LogoStockRow {
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

/**
 * Fetch Logo stock rows.
 * Throws LogoApiError on missing config, network, or non-OK / invalid response.
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

  const url = env.VITE_LOGO_API_URL.trim();

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new LogoApiError(
      'Logo API erişilemedi. Yerel ürün/stok verileri korunur.',
      undefined,
      err
    );
  }

  if (!response.ok) {
    throw new LogoApiError(
      `Logo API hata döndürdü (HTTP ${response.status}). Yerel veriler korunur.`,
      response.status
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    throw new LogoApiError(
      'Logo API yanıtı JSON olarak okunamadı. Yerel veriler korunur.',
      response.status,
      err
    );
  }

  if (!Array.isArray(data)) {
    throw new LogoApiError(
      'Logo API beklenen dizi formatında veri döndürmedi. Yerel veriler korunur.',
      response.status
    );
  }

  return data as LogoStockRow[];
}
