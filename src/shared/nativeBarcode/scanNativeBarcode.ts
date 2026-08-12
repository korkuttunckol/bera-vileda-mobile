import {
  BarcodeFormat,
  BarcodeScanner,
  LensFacing,
} from '@capacitor-mlkit/barcode-scanning';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

/** Retail product formats for native ML Kit scan (Android + iOS). */
export const NATIVE_ORDER_BARCODE_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
  BarcodeFormat.Code128,
];

/** Body/html class while CameraX preview is shown behind the WebView. */
export const NATIVE_BARCODE_SCANNING_CLASS = 'native-barcode-scanning';

export type NativeBarcodeScanResult =
  | { status: 'success'; rawValue: string; format: string }
  | { status: 'cancelled' }
  | { status: 'denied'; message: string }
  | { status: 'unsupported'; message: string }
  | { status: 'error'; message: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Barkod taranamadı.';
}

function isUserCancelled(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('cancel') ||
    message.includes('cancelled') ||
    message.includes('canceled')
  );
}

/**
 * CameraX preview sits behind the WebView. Hide app chrome and show a cancel
 * control so the native camera is visible immediately.
 */
export function mountNativeBarcodeScanOverlay(onCancel: () => void): () => void {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  document.documentElement.classList.add(NATIVE_BARCODE_SCANNING_CLASS);
  document.body.classList.add(NATIVE_BARCODE_SCANNING_CLASS);

  const overlay = document.createElement('div');
  overlay.className = 'native-barcode-scan-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Barkod tarama');

  const hint = document.createElement('p');
  hint.className = 'native-barcode-scan-overlay__hint';
  hint.textContent = 'Barkodu kameraya gösterin';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'native-barcode-scan-overlay__cancel';
  cancelButton.textContent = 'İptal';
  cancelButton.addEventListener('click', onCancel);

  overlay.append(hint, cancelButton);
  document.body.appendChild(overlay);

  return () => {
    cancelButton.removeEventListener('click', onCancel);
    overlay.remove();
    document.documentElement.classList.remove(NATIVE_BARCODE_SCANNING_CLASS);
    document.body.classList.remove(NATIVE_BARCODE_SCANNING_CLASS);
  };
}

async function runStartScanSession(): Promise<NativeBarcodeScanResult> {
  let settled = false;
  let barcodesListener: PluginListenerHandle | undefined;
  let errorListener: PluginListenerHandle | undefined;
  let unmountOverlay: (() => void) | undefined;

  const cleanup = async (): Promise<void> => {
    unmountOverlay?.();
    unmountOverlay = undefined;
    try {
      await barcodesListener?.remove();
    } catch {
      // ignore
    }
    try {
      await errorListener?.remove();
    } catch {
      // ignore
    }
    barcodesListener = undefined;
    errorListener = undefined;
    try {
      await BarcodeScanner.stopScan();
    } catch {
      // ignore — camera may already be stopped
    }
  };

  return new Promise<NativeBarcodeScanResult>((resolve) => {
    const finish = (result: NativeBarcodeScanResult): void => {
      if (settled) return;
      settled = true;
      void cleanup().finally(() => {
        resolve(result);
      });
    };

    unmountOverlay = mountNativeBarcodeScanOverlay(() => {
      finish({ status: 'cancelled' });
    });

    void (async () => {
      try {
        barcodesListener = await BarcodeScanner.addListener(
          'barcodesScanned',
          (event) => {
            if (settled) return;
            if (event.barcodes.length === 0) return;
            const first = event.barcodes[0];
            const rawValue = (first.rawValue ?? '').trim();
            if (!rawValue) return;
            finish({
              status: 'success',
              rawValue,
              format: first.format,
            });
          },
        );

        errorListener = await BarcodeScanner.addListener(
          'scanError',
          (event) => {
            if (settled) return;
            const message = event.message.trim();
            if (isUserCancelled(message)) {
              finish({ status: 'cancelled' });
              return;
            }
            finish({
              status: 'error',
              message: message || 'Barkod taranamadı.',
            });
          },
        );

        await BarcodeScanner.startScan({
          formats: NATIVE_ORDER_BARCODE_FORMATS,
          lensFacing: LensFacing.Back,
        });
      } catch (error) {
        if (isUserCancelled(error)) {
          finish({ status: 'cancelled' });
          return;
        }
        finish({ status: 'error', message: getErrorMessage(error) });
      }
    })();
  });
}

/**
 * Opens the device camera via CameraX (`startScan`) behind the WebView.
 * Does NOT use `BarcodeScanner.scan()` / Google Barcode Scanner module.
 * Browser/PWA: unsupported.
 */
export async function scanNativeBarcode(): Promise<NativeBarcodeScanResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      status: 'unsupported',
      message:
        'Kamera ile barkod tarama yalnızca BERA VİLEDA mobil uygulamasında kullanılabilir.',
    };
  }

  try {
    const supported = await BarcodeScanner.isSupported();
    if (!supported.supported) {
      return {
        status: 'unsupported',
        message: 'Bu cihazda kamera / barkod tarama desteklenmiyor.',
      };
    }
  } catch {
    // Continue — some devices still support startScan().
  }

  try {
    let permission = await BarcodeScanner.checkPermissions();
    if (permission.camera !== 'granted' && permission.camera !== 'limited') {
      permission = await BarcodeScanner.requestPermissions();
    }
    if (permission.camera !== 'granted' && permission.camera !== 'limited') {
      return {
        status: 'denied',
        message:
          'Kamera izni reddedildi. Ayarlardan kamera iznini verip tekrar deneyin.',
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Kamera izni kontrol edilemedi: ${getErrorMessage(error)}`,
    };
  }

  return runStartScanSession();
}

/** UPC-A (12 digit) → EAN-13 style for Product.barcode lookup when needed. */
export function normalizeScannedBarcodeForLookup(raw: string): string {
  const code = raw.trim();
  if (/^\d{12}$/.test(code)) {
    return `0${code}`;
  }
  return code;
}

/**
 * Candidate barcode strings to try against Product.barcode.
 * Handles UPC-A ↔ EAN-13 leading-zero differences without changing the data model.
 */
export function barcodeLookupCandidates(raw: string): string[] {
  const code = raw.trim();
  if (!code) return [];
  const candidates = [code];
  if (/^\d{12}$/.test(code)) {
    candidates.push(`0${code}`);
  }
  if (/^0\d{12}$/.test(code)) {
    candidates.push(code.slice(1));
  }
  return [...new Set(candidates)];
}
