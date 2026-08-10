import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell for BERA VİLEDA.
 * Web/PWA on Vercel is unchanged; this wraps `dist/` for Android/iOS builds only.
 */
const config: CapacitorConfig = {
  appId: 'com.beravileda.siparis',
  appName: 'BERA VİLEDA',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
