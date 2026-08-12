import {
  NATIVE_ORDER_BARCODE_FORMATS,
  scanNativeBarcode,
  type NativeBarcodeScanResult,
} from '@/shared/nativeBarcode/scanNativeBarcode';

/** Alias used by POC page / tests — same formats as order scan. */
export const NATIVE_POC_BARCODE_FORMATS = NATIVE_ORDER_BARCODE_FORMATS;

export type NativeBarcodePocScanResult = NativeBarcodeScanResult;

/**
 * Native-only ML Kit barcode scan for Android/iOS POC.
 * Thin wrapper around shared `scanNativeBarcode` (no getUserMedia / ZXing).
 */
export async function scanNativeBarcodeForPoc(): Promise<NativeBarcodePocScanResult> {
  return scanNativeBarcode();
}
