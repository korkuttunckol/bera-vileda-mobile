import { z } from 'zod';

const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function isDevAuthBypassFromRaw(raw: ImportMetaEnv): boolean {
  const appEnv = raw.VITE_APP_ENV ?? 'development';
  const apiKey = raw.VITE_FIREBASE_API_KEY ?? '';
  return appEnv === 'development' && apiKey.trim().length === 0;
}

function parseEnv(): Env {
  const raw = import.meta.env;
  const devAuthBypass = isDevAuthBypassFromRaw(raw);
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    if (!devAuthBypass) {
      const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
      console.warn(
        `[BERA VİLEDA] Firebase env değişkenleri eksik: ${missing}. .env dosyasını kontrol edin.`,
      );
    } else {
      console.info(
        '[BERA VİLEDA] Geliştirme modu: Firebase Auth geçici olarak devre dışı.',
      );
    }
    return {
      VITE_FIREBASE_API_KEY: raw.VITE_FIREBASE_API_KEY ?? '',
      VITE_FIREBASE_AUTH_DOMAIN: raw.VITE_FIREBASE_AUTH_DOMAIN ?? '',
      VITE_FIREBASE_PROJECT_ID: raw.VITE_FIREBASE_PROJECT_ID ?? '',
      VITE_FIREBASE_STORAGE_BUCKET: raw.VITE_FIREBASE_STORAGE_BUCKET ?? '',
      VITE_FIREBASE_MESSAGING_SENDER_ID:
        raw.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
      VITE_FIREBASE_APP_ID: raw.VITE_FIREBASE_APP_ID ?? '',
      VITE_APP_ENV: raw.VITE_APP_ENV ?? 'development',
    };
  }

  return result.data;
}

export const env = parseEnv();

/** Firebase API Key yokken yerel geliştirme için geçici auth bypass. */
export const isDevAuthBypassEnabled = (): boolean =>
  env.VITE_APP_ENV === 'development' && env.VITE_FIREBASE_API_KEY.trim().length === 0;

export const isFirebaseConfigured = (): boolean =>
  Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID);
