/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockIsNativePlatform,
  mockGetPlatform,
  mockIsSupported,
  mockCheckPermissions,
  mockRequestPermissions,
  mockAddListener,
  mockStartScan,
  mockStopScan,
  mockScan,
  mockIsModuleAvailable,
  mockInstallModule,
} = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn(() => true),
  mockGetPlatform: vi.fn(() => 'android'),
  mockIsSupported: vi.fn(async () => ({ supported: true })),
  mockCheckPermissions: vi.fn(async () => ({ camera: 'granted' as const })),
  mockRequestPermissions: vi.fn(async () => ({ camera: 'granted' as const })),
  mockAddListener: vi.fn(),
  mockStartScan: vi.fn(async () => undefined),
  mockStopScan: vi.fn(async () => undefined),
  mockScan: vi.fn(),
  mockIsModuleAvailable: vi.fn(),
  mockInstallModule: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockIsNativePlatform(),
    getPlatform: () => mockGetPlatform(),
  },
}));

vi.mock('@capacitor-mlkit/barcode-scanning', async () => {
  const actual = await vi.importActual<
    typeof import('@capacitor-mlkit/barcode-scanning')
  >('@capacitor-mlkit/barcode-scanning');
  return {
    ...actual,
    BarcodeScanner: {
      isSupported: mockIsSupported,
      checkPermissions: mockCheckPermissions,
      requestPermissions: mockRequestPermissions,
      addListener: mockAddListener,
      startScan: mockStartScan,
      stopScan: mockStopScan,
      scan: mockScan,
      isGoogleBarcodeScannerModuleAvailable: mockIsModuleAvailable,
      installGoogleBarcodeScannerModule: mockInstallModule,
    },
  };
});

import {
  NATIVE_BARCODE_SCANNING_CLASS,
  mountNativeBarcodeScanOverlay,
  scanNativeBarcode,
} from '@/shared/nativeBarcode/scanNativeBarcode';

type ProgressListener = (event: {
  barcodes: Array<{ rawValue: string; format: string }>;
}) => void;
type ErrorListener = (event: { message: string }) => void;

describe('scanNativeBarcode startScan (CameraX) path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = '';
    document.body.className = '';
    document
      .querySelectorAll('.native-barcode-scan-overlay')
      .forEach((node) => {
        node.remove();
      });

    mockIsNativePlatform.mockReturnValue(true);
    mockGetPlatform.mockReturnValue('android');
    mockIsSupported.mockResolvedValue({ supported: true });
    mockCheckPermissions.mockResolvedValue({ camera: 'granted' });
    mockStartScan.mockResolvedValue(undefined);
    mockStopScan.mockResolvedValue(undefined);

    mockAddListener.mockImplementation(
      async (eventName: string, listener: ProgressListener | ErrorListener) => {
        if (eventName === 'barcodesScanned') {
          queueMicrotask(() => {
            (listener as ProgressListener)({
              barcodes: [{ rawValue: '8690000000012', format: 'EAN_13' }],
            });
          });
        }
        return { remove: vi.fn(async () => undefined) };
      },
    );
  });

  afterEach(() => {
    document.documentElement.classList.remove(NATIVE_BARCODE_SCANNING_CLASS);
    document.body.classList.remove(NATIVE_BARCODE_SCANNING_CLASS);
    document
      .querySelectorAll('.native-barcode-scan-overlay')
      .forEach((node) => {
        node.remove();
      });
  });

  it('uses startScan + barcodesScanned and never calls Google module / scan()', async () => {
    const result = await scanNativeBarcode();

    expect(result).toEqual({
      status: 'success',
      rawValue: '8690000000012',
      format: 'EAN_13',
    });
    expect(mockCheckPermissions).toHaveBeenCalled();
    expect(mockAddListener).toHaveBeenCalledWith(
      'barcodesScanned',
      expect.any(Function),
    );
    expect(mockStartScan).toHaveBeenCalled();
    expect(mockStopScan).toHaveBeenCalled();
    expect(mockScan).not.toHaveBeenCalled();
    expect(mockIsModuleAvailable).not.toHaveBeenCalled();
    expect(mockInstallModule).not.toHaveBeenCalled();
  });

  it('requests camera permission when not granted', async () => {
    mockCheckPermissions.mockResolvedValue({ camera: 'prompt' });
    mockRequestPermissions.mockResolvedValue({ camera: 'granted' });

    const result = await scanNativeBarcode();
    expect(result.status).toBe('success');
    expect(mockRequestPermissions).toHaveBeenCalled();
  });

  it('returns denied when camera permission is refused', async () => {
    mockCheckPermissions.mockResolvedValue({ camera: 'denied' });
    mockRequestPermissions.mockResolvedValue({ camera: 'denied' });

    const result = await scanNativeBarcode();
    expect(result.status).toBe('denied');
    expect(mockStartScan).not.toHaveBeenCalled();
  });

  it('returns cancelled when overlay cancel is pressed', async () => {
    mockAddListener.mockImplementation(async () => ({
      remove: vi.fn(async () => undefined),
    }));
    mockStartScan.mockImplementation(async () => undefined);

    const pending = scanNativeBarcode();
    await vi.waitFor(() => {
      expect(
        document.querySelector('.native-barcode-scan-overlay__cancel'),
      ).not.toBeNull();
    });

    const cancel = document.querySelector(
      '.native-barcode-scan-overlay__cancel',
    ) as HTMLButtonElement;
    cancel.click();

    await expect(pending).resolves.toEqual({ status: 'cancelled' });
    expect(mockStopScan).toHaveBeenCalled();
  });

  it('returns cancelled on user-cancel scanError without treating as hard error', async () => {
    mockAddListener.mockImplementation(
      async (eventName: string, listener: ProgressListener | ErrorListener) => {
        if (eventName === 'scanError') {
          queueMicrotask(() => {
            (listener as ErrorListener)({ message: 'User cancelled' });
          });
        }
        return { remove: vi.fn(async () => undefined) };
      },
    );

    const result = await scanNativeBarcode();
    expect(result).toEqual({ status: 'cancelled' });
  });

  it('returns unsupported on non-native platforms', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    const result = await scanNativeBarcode();
    expect(result.status).toBe('unsupported');
    expect(mockStartScan).not.toHaveBeenCalled();
  });
});

describe('mountNativeBarcodeScanOverlay', () => {
  afterEach(() => {
    document.documentElement.classList.remove(NATIVE_BARCODE_SCANNING_CLASS);
    document.body.classList.remove(NATIVE_BARCODE_SCANNING_CLASS);
    document
      .querySelectorAll('.native-barcode-scan-overlay')
      .forEach((node) => {
        node.remove();
      });
  });

  it('adds scanning class and removes it on unmount', () => {
    const onCancel = vi.fn();
    const unmount = mountNativeBarcodeScanOverlay(onCancel);
    expect(
      document.documentElement.classList.contains(NATIVE_BARCODE_SCANNING_CLASS),
    ).toBe(true);
    expect(document.body.classList.contains(NATIVE_BARCODE_SCANNING_CLASS)).toBe(
      true,
    );
    expect(document.querySelector('.native-barcode-scan-overlay')).not.toBeNull();

    unmount();
    expect(
      document.documentElement.classList.contains(NATIVE_BARCODE_SCANNING_CLASS),
    ).toBe(false);
    expect(document.querySelector('.native-barcode-scan-overlay')).toBeNull();
  });
});
