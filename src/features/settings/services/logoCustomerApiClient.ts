/**
 * Logo Cari (CLCARD) API client
 *
 * Fetches customer rows from the Logo endpoint as a JSON array.
 * Does not mutate local data — callers decide how to apply results.
 *
 * Locked meanings (do not confuse with ORFICHE / branches):
 *   LOGICALREF → Customer.erpId
 *   CODE       → Customer.code
 *   DEFINITION_ / DEFINITION → Customer.name
 *   SPECODE    → Customer.logoSalesRepCode  (satış elemanı — ŞUBE DEĞİL)
 *   SPECODE2   → Customer.specialCode2
 *   CITY       → address.city
 *   TOWN       → address.district
 */

import { env, isLogoCustomersApiConfigured } from '@/config/env';

/** Raw Logo CLCARD API row field names (exact API keys). */
export interface LogoCustomerRow {
  LOGICALREF?: string | number | null;
  CODE?: string | number | null;
  DEFINITION_?: string | number | null;
  DEFINITION?: string | number | null;
  SPECODE?: string | number | null;
  SPECODE2?: string | number | null;
  CITY?: string | number | null;
  TOWN?: string | number | null;
  [key: string]: unknown;
}

export class LogoCustomerApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LogoCustomerApiError';
  }
}

/**
 * Fetch Logo customer (CLCARD) rows.
 * Throws LogoCustomerApiError on missing config, network, non-OK,
 * empty, or invalid response.
 * Never clears local customer data — callers must not wipe IndexedDB on failure.
 */
export async function fetchLogoCustomerRows(
  signal?: AbortSignal,
): Promise<LogoCustomerRow[]> {
  if (!isLogoCustomersApiConfigured()) {
    throw new LogoCustomerApiError(
      'Logo cari API URL yapılandırılmamış (VITE_LOGO_CUSTOMERS_API_URL).',
    );
  }

  const url = env.VITE_LOGO_CUSTOMERS_API_URL.trim();

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
    throw new LogoCustomerApiError(
      'Logo cari API erişilemedi. Yerel cari verileri korunur.',
      undefined,
      err,
    );
  }

  if (!response.ok) {
    throw new LogoCustomerApiError(
      `Logo cari API hata döndürdü (HTTP ${response.status}). Yerel veriler korunur.`,
      response.status,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    throw new LogoCustomerApiError(
      'Logo cari API yanıtı JSON olarak okunamadı. Yerel veriler korunur.',
      response.status,
      err,
    );
  }

  if (!Array.isArray(data)) {
    throw new LogoCustomerApiError(
      'Logo cari API beklenen dizi formatında veri döndürmedi. Yerel veriler korunur.',
      response.status,
    );
  }

  // Empty array is treated as unsafe / incomplete — do not overwrite locals.
  if (data.length === 0) {
    throw new LogoCustomerApiError(
      'Logo cari API boş dizi döndürdü. Yerel cariler korunur (pasifleştirme/silme yok).',
      response.status,
    );
  }

  return data as LogoCustomerRow[];
}
