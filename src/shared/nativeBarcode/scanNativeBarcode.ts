import {
  BarcodeFormat,
  BarcodeScanner,
  GoogleBarcodeScannerModuleInstallState,
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

/** Default wait for Google Play barcode_ui module download + install. */
export const GOOGLE_BARCODE_MODULE_INSTALL_TIMEOUT_MS = 120_000;

export type ScanNativeBarcodeOptions = {
  /** Visible status for the user while camera / module prepares. */
  onStatus?: (message: string) => void;
  /** Override install wait (tests). */
  moduleInstallTimeoutMs?: number;
};

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
 * Ensures the Android Google Code Scanner (barcode_ui) module is ready.
 *
 * `installGoogleBarcodeScannerModule()` only *starts* installation — callers
 * must wait for `googleBarcodeScannerModuleInstallProgress` COMPLETED (or
 * availability) before calling `scan()`.
 */
export async function ensureGoogleBarcodeScannerModule(options: {
  onStatus?: (message: string) => void;
  timeoutMs?: number;
} = {}): Promise<void> {
  const {
    onStatus,
    timeoutMs = GOOGLE_BARCODE_MODULE_INSTALL_TIMEOUT_MS,
  } = options;

  const initial = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (initial.available) {
    return;
  }

  onStatus?.('Barkod tarayıcı hazırlanıyor...');

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let handle: PluginListenerHandle | undefined;

    const finish = (action: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      clearInterval(pollId);
      void handle?.remove().catch(() => undefined);
      action();
    };

    const timeoutId = setTimeout(() => {
      finish(() => {
        reject(
          new Error(
            'Google Barkod Tarayıcı modülü kurulumu zaman aşımına uğradı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
          ),
        );
      });
    }, timeoutMs);

    const pollId = setInterval(() => {
      void (async () => {
        if (settled) return;
        try {
          const status =
            await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
          if (status.available) {
            finish(() => {
              resolve();
            });
          }
        } catch {
          // Ignore transient poll errors while install is in progress.
        }
      })();
    }, 1500);

    void (async () => {
      try {
        // Register listener before install() so early COMPLETED events are not missed.
        handle = await BarcodeScanner.addListener(
          'googleBarcodeScannerModuleInstallProgress',
          (event) => {
            if (settled) return;

            if (
              event.state ===
                GoogleBarcodeScannerModuleInstallState.DOWNLOADING ||
              event.state ===
                GoogleBarcodeScannerModuleInstallState.INSTALLING ||
              event.state === GoogleBarcodeScannerModuleInstallState.PENDING ||
              event.state ===
                GoogleBarcodeScannerModuleInstallState.DOWNLOAD_PAUSED
            ) {
              onStatus?.('Barkod tarayıcı hazırlanıyor...');
            }

            if (
              event.state === GoogleBarcodeScannerModuleInstallState.COMPLETED
            ) {
              finish(() => {
                resolve();
              });
              return;
            }

            if (
              event.state === GoogleBarcodeScannerModuleInstallState.FAILED
            ) {
              finish(() => {
                reject(
                  new Error(
                    'Google Barkod Tarayıcı modülü kurulumu başarısız oldu. Google Play Servisleri ve internet bağlantısını kontrol edip tekrar deneyin.',
                  ),
                );
              });
              return;
            }

            if (
              event.state === GoogleBarcodeScannerModuleInstallState.CANCELED
            ) {
              finish(() => {
                reject(
                  new Error(
                    'Google Barkod Tarayıcı modülü kurulumu iptal edildi.',
                  ),
                );
              });
            }
          },
        );

        await BarcodeScanner.installGoogleBarcodeScannerModule();
      } catch (error) {
        finish(() => {
          reject(
            error instanceof Error
              ? error
              : new Error(getErrorMessage(error)),
          );
        });
      }
    })();
  });

  const after = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!after.available) {
    throw new Error(
      'Google Barkod Tarayıcı modülü kuruldu ancak henüz kullanıma hazır değil. Lütfen birkaç saniye sonra tekrar deneyin.',
    );
  }
}

/**
 * Opens the native ML Kit ready-to-use scanner UI.
 * Auto-detects a barcode (no in-app "scan now" button). Returns one raw string.
 * Browser/PWA: unsupported (no getUserMedia / ZXing path).
 */
export async function scanNativeBarcode(
  options: ScanNativeBarcodeOptions = {},
): Promise<NativeBarcodeScanResult> {
  const { onStatus, moduleInstallTimeoutMs } = options;

  if (!Capacitor.isNativePlatform()) {
    return {
      status: 'unsupported',
      message:
        'Kamera ile barkod tarama yalnızca BERA VİLEDA mobil uygulamasında kullanılabilir.',
    };
  }

  onStatus?.('Kamera hazırlanıyor...');

  try {
    const supported = await BarcodeScanner.isSupported();
    if (!supported.supported) {
      return {
        status: 'unsupported',
        message: 'Bu cihazda kamera / barkod tarama desteklenmiyor.',
      };
    }
  } catch {
    // Continue — some devices still support scan().
  }

  // Android Google Play Services module (required for scan() UI).
  if (Capacitor.getPlatform() === 'android') {
    try {
      await ensureGoogleBarcodeScannerModule({
        onStatus,
        timeoutMs: moduleInstallTimeoutMs,
      });
    } catch (error) {
      return {
        status: 'error',
        message: getErrorMessage(error),
      };
    }
  }

  onStatus?.('Kamera hazırlanıyor...');

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

  try {
    const { barcodes } = await BarcodeScanner.scan({
      formats: NATIVE_ORDER_BARCODE_FORMATS,
      autoZoom: true,
    });
    if (barcodes.length === 0) {
      return {
        status: 'error',
        message: 'Barkod algılanamadı. Tekrar deneyin.',
      };
    }
    const first = barcodes[0];
    const rawValue = (first.rawValue ?? '').trim();
    if (!rawValue) {
      return {
        status: 'error',
        message: 'Barkod algılanamadı. Tekrar deneyin.',
      };
    }
    return {
      status: 'success',
      rawValue,
      format: first.format,
    };
  } catch (error) {
    if (isUserCancelled(error)) {
      return { status: 'cancelled' };
    }
    return { status: 'error', message: getErrorMessage(error) };
  }
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
