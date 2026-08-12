import {
  BarcodeFormat,
  BarcodeScanner,
} from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

/** Retail product formats for native ML Kit scan (Android + iOS). */
export const NATIVE_ORDER_BARCODE_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
  BarcodeFormat.Code128,
];

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
 * Opens the native ML Kit ready-to-use scanner UI.
 * Auto-detects a barcode (no in-app "scan now" button). Returns one raw string.
 * Browser/PWA: unsupported (no getUserMedia / ZXing path).
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
    // Continue — some devices still support scan().
  }

  // Android Google Play Services module (required for scan() UI).
  if (Capacitor.getPlatform() === 'android') {
    try {
      const moduleStatus =
        await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!moduleStatus.available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Google Barkod Tarayıcı modülü hazırlanamadı: ${getErrorMessage(error)}`,
      };
    }
  }

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
