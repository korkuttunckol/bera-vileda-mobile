import { describe, expect, it } from 'vitest';
import { BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { NATIVE_POC_BARCODE_FORMATS } from '@/features/nativeBarcodePoc/scanNativeBarcodeForPoc';
import { ROUTES } from '@/shared/constants/routes';

describe('native barcode POC config', () => {
  it('includes retail product formats with EAN-13 first priority set', () => {
    expect(NATIVE_POC_BARCODE_FORMATS).toContain(BarcodeFormat.Ean13);
    expect(NATIVE_POC_BARCODE_FORMATS).toEqual([
      BarcodeFormat.Ean13,
      BarcodeFormat.Ean8,
      BarcodeFormat.UpcA,
      BarcodeFormat.UpcE,
      BarcodeFormat.Code128,
    ]);
  });

  it('exposes isolated POC route outside order flows', () => {
    expect(ROUTES.NATIVE_BARCODE_POC).toBe('/dev/native-barcode-poc');
  });
});
