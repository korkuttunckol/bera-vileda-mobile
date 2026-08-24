import {
  isLogoSalesConditionsApiConfigured,
  resolveSalesConditionsExternalUrl,
  resolveSalesConditionsLanUrl,
} from '@/config/env';
import {
  fetchLogoJsonWithFallback,
  LogoHttpFetchError,
} from '@/features/settings/services/logoApiFetch';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import {
  parseSalesConditionItem,
  type SalesConditionItemResult,
} from '@/features/orders/utils/applySalesConditions';

export interface SalesConditionsQuoteRequestItem {
  logicalRef?: string;
  barcode?: string;
}

export interface SalesConditionsQuoteRequest {
  customerCode: string;
  items: SalesConditionsQuoteRequestItem[];
}

export interface SalesConditionsQuoteResponse {
  customerCode: string;
  items: SalesConditionItemResult[];
}

export class SalesConditionsApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SalesConditionsApiError';
  }
}

function toSalesConditionsError(err: unknown): never {
  if (err instanceof DOMException && err.name === 'AbortError') {
    throw err;
  }
  if (err instanceof LogoHttpFetchError) {
    throw new SalesConditionsApiError(err.message, err.statusCode, err.cause);
  }
  throw err;
}

/**
 * The legacy IIS LogoApi endpoint accepts GET and POST. On iOS, GET avoids a
 * JSON POST preflight request, while still sending the exact same quote input.
 */
function buildSalesConditionsUrl(
  endpoint: string,
  customerCode: string,
  items: SalesConditionsQuoteRequestItem[],
): string {
  if (!endpoint.trim()) return '';

  const url = new URL(endpoint);
  url.searchParams.set('customerCode', customerCode);
  url.searchParams.set(
    'logicalRefs',
    items.map((item) => item.logicalRef ?? '').join(','),
  );
  url.searchParams.set(
    'barcodes',
    items.map((item) => item.barcode ?? '').join(','),
  );
  return url.toString();
}

/**
 * The iOS WebView can reject an otherwise reachable legacy HTTP endpoint
 * before the request reaches IIS. Native HTTP is not subject to WebView CORS,
 * so use it inside the installed app while retaining the regular browser flow
 * for the web/PWA build.
 */
async function fetchNativeSalesConditionsWithFallback(
  lanUrl: string,
  externalUrl: string,
  signal: AbortSignal | undefined,
): Promise<{ data: unknown; status: number }> {
  const urls = [lanUrl, externalUrl].filter(Boolean);
  let lastError: unknown;

  for (const url of urls) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const response = await CapacitorHttp.get({
        url,
        headers: { Accept: 'application/json' },
        connectTimeout: 20_000,
        readTimeout: 20_000,
        responseType: 'json',
      });

      if (response.status < 200 || response.status >= 300) {
        throw new LogoHttpFetchError(
          `Satış koşulları API hata döndürdü (HTTP ${response.status}).`,
          response.status,
          undefined,
          'http',
        );
      }

      const data =
        typeof response.data === 'string'
          ? JSON.parse(response.data)
          : response.data;
      return { data, status: response.status };
    } catch (err) {
      if (err instanceof LogoHttpFetchError && err.kind === 'http') {
        throw err;
      }
      lastError = err;
    }
  }

  throw new LogoHttpFetchError(
    'Satış koşulları API erişilemedi. Liste fiyatı korunur.',
    undefined,
    lastError,
    'network',
  );
}

/**
 * Quotes net prices via LogoApi (parameterized SELECT). Never talks to SQL from the device.
 */
export async function fetchSalesConditionsQuote(
  request: SalesConditionsQuoteRequest,
  signal?: AbortSignal,
): Promise<SalesConditionsQuoteResponse> {
  if (!isLogoSalesConditionsApiConfigured()) {
    throw new SalesConditionsApiError(
      'Satış koşulları API URL yapılandırılmamış.',
    );
  }

  const customerCode = request.customerCode.trim();
  const items = request.items
    .map((item) => ({
      logicalRef: item.logicalRef?.trim() || undefined,
      barcode: item.barcode?.trim() || undefined,
    }))
    .filter((item) => item.logicalRef || item.barcode);

  if (!customerCode || items.length === 0) {
    throw new SalesConditionsApiError(
      'Cari kodu ve en az bir ürün gereklidir.',
    );
  }

  let data: unknown;
  let status: number | undefined;
  try {
    const lanUrl = buildSalesConditionsUrl(
      resolveSalesConditionsLanUrl(),
      customerCode,
      items,
    );
    const externalUrl = buildSalesConditionsUrl(
      resolveSalesConditionsExternalUrl(),
      customerCode,
      items,
    );

    if (Capacitor.isNativePlatform()) {
      const result = await fetchNativeSalesConditionsWithFallback(
        lanUrl,
        externalUrl,
        signal,
      );
      data = result.data;
      status = result.status;
    } else {
      const result = await fetchLogoJsonWithFallback({
        channel: 'salesConditions',
        lanUrl,
        externalUrl,
        signal,
        timeoutMs: 20_000,
        networkErrorMessage:
          'Satış koşulları API erişilemedi. Liste fiyatı korunur.',
        httpErrorMessage: (httpStatus) =>
          `Satış koşulları API hata döndürdü (HTTP ${httpStatus}).`,
        jsonErrorMessage: 'Satış koşulları API yanıtı JSON değil.',
      });
      data = result.data;
      status = result.status;
    }
  } catch (err) {
    toSalesConditionsError(err);
  }

  if (!data || typeof data !== 'object') {
    throw new SalesConditionsApiError(
      'Satış koşulları API beklenen nesneyi döndürmedi.',
      status,
    );
  }

  const payload = data as Record<string, unknown>;
  const rawItems = payload.items;
  if (!Array.isArray(rawItems)) {
    throw new SalesConditionsApiError(
      'Satış koşulları API ürün listesi döndürmedi.',
      status,
    );
  }

  const parsed = rawItems
    .map((row) => parseSalesConditionItem(row))
    .filter((row): row is SalesConditionItemResult => row !== null);

  return {
    customerCode: String(payload.customerCode ?? customerCode),
    items: parsed,
  };
}
