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
    };
  }

  return result.data;
}

export const env = parseEnv();

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
