import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

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
  plugins: {
    // Do not resize the WKWebView/app shell globally. Confirm sheet lifts itself
    // on iOS via keyboardWillShow height; other screens keep existing layout.
    Keyboard: {
      resize: KeyboardResize.None,
    },
  },
};

export default config;
