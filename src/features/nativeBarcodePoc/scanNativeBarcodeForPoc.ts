import {
  BarcodeFormat,
  BarcodeScanner,
} from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

/** POC formats — retail product barcodes (no order/lookup wiring). */
export const NATIVE_POC_BARCODE_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
  BarcodeFormat.Code128,
];

export type NativeBarcodePocScanResult =
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
 * Native-only ML Kit barcode scan for Android POC.
 * Does not use getUserMedia / ZXing / BarcodeDetector.
 */
export async function scanNativeBarcodeForPoc(): Promise<NativeBarcodePocScanResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      status: 'unsupported',
      message:
        'Bu POC yalnız Capacitor Android uygulamasında çalışır. Tarayıcıda native kamera yoktur.',
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
    // Older plugin edge — continue to permission/scan.
  }

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

  let permission = await BarcodeScanner.checkPermissions();
  if (permission.camera !== 'granted') {
    permission = await BarcodeScanner.requestPermissions();
  }
  if (permission.camera !== 'granted') {
    return {
      status: 'denied',
      message:
        'Kamera izni reddedildi. Ayarlardan kamera iznini verip tekrar deneyin.',
    };
  }

  try {
    const { barcodes } = await BarcodeScanner.scan({
      formats: NATIVE_POC_BARCODE_FORMATS,
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
