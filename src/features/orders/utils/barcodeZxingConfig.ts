/** Logical product barcode formats for continuous camera scan (ZXing primary). */
export const ZXING_PRODUCT_FORMAT_NAMES = [
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'CODE_128',
] as const;

export type ZxingProductFormatName = (typeof ZXING_PRODUCT_FORMAT_NAMES)[number];

/**
 * Normalize decoder text before Product.barcode lookup.
 * UPC-A is an EAN-13 subset: 12-digit values get a leading 0 so they match
 * EAN-13-stored barcodes (common GS1 / TR retail case).
 */
export function normalizeScannedBarcodeForLookup(raw: string): string {
  const code = raw.trim();
  if (/^\d{12}$/.test(code)) {
    return `0${code}`;
  }
  return code;
}

export function isConfiguredZxingFormatName(name: string): boolean {
  return (ZXING_PRODUCT_FORMAT_NAMES as readonly string[]).includes(name);
}
