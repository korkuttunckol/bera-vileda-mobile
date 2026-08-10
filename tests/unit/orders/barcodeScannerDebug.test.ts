import { describe, expect, it, vi } from 'vitest';
import {
  canvasHasNonZeroPixels,
  isBarcodeDebugEnabled,
  mapDecodeErrorToDebugStatus,
} from '@/features/orders/utils/barcodeScannerDebug';

describe('isBarcodeDebugEnabled', () => {
  it('is true in development', () => {
    expect(isBarcodeDebugEnabled('', true)).toBe(true);
  });

  it('is true with ?barcodeDebug=1 in production', () => {
    expect(isBarcodeDebugEnabled('?barcodeDebug=1', false)).toBe(true);
  });

  it('is false in production without query', () => {
    expect(isBarcodeDebugEnabled('', false)).toBe(false);
    expect(isBarcodeDebugEnabled('?foo=1', false)).toBe(false);
  });
});

describe('mapDecodeErrorToDebugStatus', () => {
  it('separates NotFound / Checksum / Format / other', () => {
    expect(mapDecodeErrorToDebugStatus({ name: 'NotFoundException' })).toEqual({
      status: 'NotFoundException',
      otherName: null,
    });
    expect(mapDecodeErrorToDebugStatus({ name: 'ChecksumException' })).toEqual({
      status: 'ChecksumException',
      otherName: null,
    });
    expect(mapDecodeErrorToDebugStatus({ name: 'FormatException' })).toEqual({
      status: 'FormatException',
      otherName: null,
    });
    expect(mapDecodeErrorToDebugStatus({ name: 'TypeError' })).toEqual({
      status: 'other',
      otherName: 'TypeError',
    });
  });
});

describe('canvasHasNonZeroPixels', () => {
  it('returns false for empty canvas', () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    expect(canvasHasNonZeroPixels(canvas)).toBe(false);
  });

  it('returns true when a sampled pixel is non-zero', () => {
    const getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray([10, 20, 30, 255]),
    }));
    const canvas = {
      width: 10,
      height: 10,
      getContext: () => ({ getImageData }),
    } as unknown as HTMLCanvasElement;
    expect(canvasHasNonZeroPixels(canvas)).toBe(true);
    expect(getImageData).toHaveBeenCalled();
  });
});
