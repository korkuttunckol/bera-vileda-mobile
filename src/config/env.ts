import { z } from 'zod';

const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  /** Optional Logo Wings stock API (LAN). Empty alone does not disable if external is set. */
  VITE_LOGO_API_URL: z.string().optional().default(''),
  /** Optional Logo Wings stock API (WAN / external). Tried after LAN failure. */
  VITE_LOGO_API_EXTERNAL_URL: z.string().optional().default(''),
  /** Optional Logo Wings customers (CLCARD) API (LAN). */
  VITE_LOGO_CUSTOMERS_API_URL: z.string().optional().default(''),
  /** Optional Logo Wings customers API (WAN / external). Tried after LAN failure. */
  VITE_LOGO_CUSTOMERS_API_EXTERNAL_URL: z.string().optional().default(''),
  /** Optional sales-conditions quote API (LAN). Empty → derived from stock LAN URL. */
  VITE_LOGO_SALES_CONDITIONS_API_URL: z.string().optional().default(''),
  /** Optional sales-conditions quote API (WAN). Empty → derived from stock WAN URL. */
  VITE_LOGO_SALES_CONDITIONS_API_EXTERNAL_URL: z.string().optional().default(''),
  /** LogoApi authentication endpoint (POST userCode/password → token). */
  VITE_LOGO_AUTH_URL: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const raw = import.meta.env;
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    console.warn(
      `[BERA VİLEDA] Firebase env değişkenleri eksik: ${missing}. .env dosyasını kontrol edin.`,
    );
    return {
      VITE_FIREBASE_API_KEY: raw.VITE_FIREBASE_API_KEY ?? '',
      VITE_FIREBASE_AUTH_DOMAIN: raw.VITE_FIREBASE_AUTH_DOMAIN ?? '',
      VITE_FIREBASE_PROJECT_ID: raw.VITE_FIREBASE_PROJECT_ID ?? '',
      VITE_FIREBASE_STORAGE_BUCKET: raw.VITE_FIREBASE_STORAGE_BUCKET ?? '',
      VITE_FIREBASE_MESSAGING_SENDER_ID:
        raw.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
      VITE_FIREBASE_APP_ID: raw.VITE_FIREBASE_APP_ID ?? '',
      VITE_APP_ENV: raw.VITE_APP_ENV ?? 'development',
      VITE_LOGO_API_URL: raw.VITE_LOGO_API_URL ?? '',
      VITE_LOGO_API_EXTERNAL_URL: raw.VITE_LOGO_API_EXTERNAL_URL ?? '',
      VITE_LOGO_CUSTOMERS_API_URL: raw.VITE_LOGO_CUSTOMERS_API_URL ?? '',
      VITE_LOGO_CUSTOMERS_API_EXTERNAL_URL:
        raw.VITE_LOGO_CUSTOMERS_API_EXTERNAL_URL ?? '',
      VITE_LOGO_SALES_CONDITIONS_API_URL:
        raw.VITE_LOGO_SALES_CONDITIONS_API_URL ?? '',
      VITE_LOGO_SALES_CONDITIONS_API_EXTERNAL_URL:
        raw.VITE_LOGO_SALES_CONDITIONS_API_EXTERNAL_URL ?? '',
      VITE_LOGO_AUTH_URL: raw.VITE_LOGO_AUTH_URL ?? '',
    };
  }

  return result.data;
}

export const env = parseEnv();

const SALES_CONDITIONS_ASHX = 'satisKosullari.ashx';

/** Replace trailing *.ashx (and query) with a sibling handler name. */
export function deriveLogoApiSibling(
  url: string,
  ashxFileName: string,
): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  const withoutQuery = trimmed.split('?')[0] ?? trimmed;
  const slash = withoutQuery.lastIndexOf('/');
  if (slash < 0) return '';
  return `${withoutQuery.slice(0, slash + 1)}${ashxFileName}`;
}

export function resolveSalesConditionsLanUrl(): string {
  const explicit = env.VITE_LOGO_SALES_CONDITIONS_API_URL.trim();
  if (explicit) return explicit;
  return deriveLogoApiSibling(env.VITE_LOGO_API_URL, SALES_CONDITIONS_ASHX);
}

export function resolveSalesConditionsExternalUrl(): string {
  const explicit = env.VITE_LOGO_SALES_CONDITIONS_API_EXTERNAL_URL.trim();
  if (explicit) return explicit;
  return deriveLogoApiSibling(
    env.VITE_LOGO_API_EXTERNAL_URL,
    SALES_CONDITIONS_ASHX,
  );
}

export const isFirebaseConfigured = (): boolean =>
  Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID);

/** Stock sync enabled when LAN and/or external stock URL is set. */
export const isLogoApiConfigured = (): boolean =>
  Boolean(
    env.VITE_LOGO_API_URL.trim() || env.VITE_LOGO_API_EXTERNAL_URL.trim(),
  );

/** Customer sync enabled when LAN and/or external customers URL is set. */
export const isLogoCustomersApiConfigured = (): boolean =>
  Boolean(
    env.VITE_LOGO_CUSTOMERS_API_URL.trim() ||
      env.VITE_LOGO_CUSTOMERS_API_EXTERNAL_URL.trim(),
  );

/** Sales-conditions quote enabled when explicit or derivable from stock URLs. */
export const isLogoSalesConditionsApiConfigured = (): boolean =>
  Boolean(
    resolveSalesConditionsLanUrl() || resolveSalesConditionsExternalUrl(),
  );

/** LogoApi auth login enabled when auth URL is set. */
export const isLogoAuthConfigured = (): boolean =>
  Boolean(env.VITE_LOGO_AUTH_URL.trim());

/** Cari hareket statement API — derived from customers Logo URLs. */
export const isLogoCariHareketApiConfigured = (): boolean =>
  isLogoCustomersApiConfigured();
