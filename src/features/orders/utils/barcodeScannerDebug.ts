/**
 * Runtime barcode-scanner debug helpers.
 * Overlay is only for DEV or `?barcodeDebug=1` — not for normal production UX.
 */

export type BarcodeDebugDecodeStatus =
  | 'success'
  | 'NotFoundException'
  | 'ChecksumException'
  | 'FormatException'
  | 'other'
  | 'not_ready';

export type BarcodeDebugLookupStatus =
  | 'skipped'
  | 'found'
  | 'not_found'
  | 'out_of_stock';

export interface BarcodeManualScanDebugSnapshot {
  engine: 'ZXing';
  scannedAt: string;
  video: {
    readyState: number;
    videoWidth: number;
    videoHeight: number;
  };
  track: {
    width: number | null;
    height: number | null;
    facingMode: string | null;
  };
  capture: {
    canvasWidth: number;
    canvasHeight: number;
    hasNonZeroPixels: boolean;
    thumbnailDataUrl: string | null;
  };
  decode: {
    status: BarcodeDebugDecodeStatus;
    otherName: string | null;
  };
  rawBarcode: string | null;
  barcodeFormat: string | null;
  normalizedBarcode: string | null;
  lookup: BarcodeDebugLookupStatus;
}

export function isBarcodeDebugEnabled(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  isDev: boolean = import.meta.env.DEV,
): boolean {
  if (isDev) return true;
  try {
    return new URLSearchParams(search).get('barcodeDebug') === '1';
  } catch {
    return false;
  }
}

/** Sparse grid sample — true if any sampled pixel is non-transparent / non-black-zero. */
export function canvasHasNonZeroPixels(canvas: HTMLCanvasElement): boolean {
  if (canvas.width <= 0 || canvas.height <= 0) return false;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.getImageData !== 'function') return false;

  const steps = 10;
  for (let yi = 0; yi < steps; yi += 1) {
    for (let xi = 0; xi < steps; xi += 1) {
      const x = Math.floor((xi / (steps - 1)) * (canvas.width - 1));
      const y = Math.floor((yi / (steps - 1)) * (canvas.height - 1));
      try {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        if (
          pixel[0] !== 0 ||
          pixel[1] !== 0 ||
          pixel[2] !== 0 ||
          pixel[3] !== 0
        ) {
          return true;
        }
      } catch {
        return false;
      }
    }
  }
  return false;
}

export function canvasToDebugThumbnail(
  source: HTMLCanvasElement,
  maxEdge = 240,
): string | null {
  if (source.width <= 0 || source.height <= 0) return null;
  try {
    const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const thumb = document.createElement('canvas');
    thumb.width = width;
    thumb.height = height;
    const ctx = thumb.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, width, height);
    return thumb.toDataURL('image/jpeg', 0.55);
  } catch {
    return null;
  }
}

export function mapDecodeErrorToDebugStatus(error: unknown): {
  status: Exclude<BarcodeDebugDecodeStatus, 'success' | 'not_ready'>;
  otherName: string | null;
} {
  let name = '';
  if (error && typeof error === 'object' && 'name' in error) {
    const rawName = (error as { name?: unknown }).name;
    name = typeof rawName === 'string' ? rawName : '';
  }
  if (name === 'NotFoundException') {
    return { status: 'NotFoundException', otherName: null };
  }
  if (name === 'ChecksumException') {
    return { status: 'ChecksumException', otherName: null };
  }
  if (name === 'FormatException') {
    return { status: 'FormatException', otherName: null };
  }
  return { status: 'other', otherName: name || 'unknown' };
}
