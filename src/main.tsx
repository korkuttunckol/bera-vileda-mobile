import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App } from './app/App';
import { ROUTES } from '@/shared/constants/routes';
import './styles/globals.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Android POC convenience: open the isolated barcode test screen on cold start.
// Web/Vercel PWA is unaffected (not a native platform).
if (
  Capacitor.isNativePlatform() &&
  (window.location.pathname === '/' || window.location.pathname === '')
) {
  window.location.replace(ROUTES.NATIVE_BARCODE_POC);
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
