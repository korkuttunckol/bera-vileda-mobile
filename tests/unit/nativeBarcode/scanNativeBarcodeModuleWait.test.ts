import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleBarcodeScannerModuleInstallState } from '@capacitor-mlkit/barcode-scanning';

const {
  mockIsNativePlatform,
  mockGetPlatform,
  mockIsSupported,
  mockIsModuleAvailable,
  mockInstallModule,
  mockAddListener,
  mockCheckPermissions,
  mockRequestPermissions,
  mockScan,
} = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn(() => true),
  mockGetPlatform: vi.fn(() => 'android'),
  mockIsSupported: vi.fn(async () => ({ supported: true })),
  mockIsModuleAvailable: vi.fn(async () => ({ available: true })),
  mockInstallModule: vi.fn(async () => undefined),
  mockAddListener: vi.fn(),
  mockCheckPermissions: vi.fn(async () => ({ camera: 'granted' as const })),
  mockRequestPermissions: vi.fn(async () => ({ camera: 'granted' as const })),
  mockScan: vi.fn(async () => ({
    barcodes: [{ rawValue: '8690000000012', format: 'EAN_13' }],
  })),
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
      isGoogleBarcodeScannerModuleAvailable: mockIsModuleAvailable,
      installGoogleBarcodeScannerModule: mockInstallModule,
      addListener: mockAddListener,
      checkPermissions: mockCheckPermissions,
      requestPermissions: mockRequestPermissions,
      scan: mockScan,
    },
  };
});

import {
  ensureGoogleBarcodeScannerModule,
  scanNativeBarcode,
} from '@/shared/nativeBarcode/scanNativeBarcode';

describe('ensureGoogleBarcodeScannerModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsModuleAvailable.mockResolvedValue({ available: true });
    mockInstallModule.mockResolvedValue(undefined);
    mockAddListener.mockResolvedValue({
      remove: vi.fn(async () => undefined),
    });
  });

  it('returns immediately when module is already available', async () => {
    await ensureGoogleBarcodeScannerModule();
    expect(mockInstallModule).not.toHaveBeenCalled();
    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it('waits for COMPLETED before resolving when module must be installed', async () => {
    mockIsModuleAvailable
      .mockResolvedValueOnce({ available: false })
      .mockResolvedValue({ available: true });

    type ProgressListener = (event: {
      state: GoogleBarcodeScannerModuleInstallState;
      progress?: number;
    }) => void;

    let progressListener: ProgressListener | undefined;
    mockAddListener.mockImplementation(
      async (_event: string, listener: ProgressListener) => {
        progressListener = listener;
        return { remove: vi.fn(async () => undefined) };
      },
    );

    mockInstallModule.mockImplementation(async () => {
      queueMicrotask(() => {
        progressListener?.({
          state: GoogleBarcodeScannerModuleInstallState.DOWNLOADING,
          progress: 10,
        });
        progressListener?.({
          state: GoogleBarcodeScannerModuleInstallState.COMPLETED,
          progress: 100,
        });
      });
    });

    const statuses: string[] = [];
    await ensureGoogleBarcodeScannerModule({
      onStatus: (message) => statuses.push(message),
      timeoutMs: 5_000,
    });

    expect(mockAddListener).toHaveBeenCalledWith(
      'googleBarcodeScannerModuleInstallProgress',
      expect.any(Function),
    );
    expect(mockInstallModule).toHaveBeenCalledTimes(1);
    expect(statuses[0]).toBe('Barkod tarayıcı hazırlanıyor...');
  });

  it('rejects when install reports FAILED', async () => {
    mockIsModuleAvailable.mockResolvedValue({ available: false });

    type ProgressListener = (event: {
      state: GoogleBarcodeScannerModuleInstallState;
    }) => void;

    let progressListener: ProgressListener | undefined;
    mockAddListener.mockImplementation(
      async (_event: string, listener: ProgressListener) => {
        progressListener = listener;
        return { remove: vi.fn(async () => undefined) };
      },
    );

    mockInstallModule.mockImplementation(async () => {
      queueMicrotask(() => {
        progressListener?.({
          state: GoogleBarcodeScannerModuleInstallState.FAILED,
        });
      });
    });

    await expect(
      ensureGoogleBarcodeScannerModule({ timeoutMs: 5_000 }),
    ).rejects.toThrow(/kurulumu başarısız/i);
  });

  it('does not call scan before module install completes', async () => {
    mockGetPlatform.mockReturnValue('android');
    mockIsNativePlatform.mockReturnValue(true);
    mockIsSupported.mockResolvedValue({ supported: true });
    mockCheckPermissions.mockResolvedValue({ camera: 'granted' });

    const callOrder: string[] = [];
    mockIsModuleAvailable
      .mockResolvedValueOnce({ available: false })
      .mockResolvedValue({ available: true });

    type ProgressListener = (event: {
      state: GoogleBarcodeScannerModuleInstallState;
    }) => void;
    let progressListener: ProgressListener | undefined;

    mockAddListener.mockImplementation(
      async (_event: string, listener: ProgressListener) => {
        callOrder.push('addListener');
        progressListener = listener;
        return { remove: vi.fn(async () => undefined) };
      },
    );

    mockInstallModule.mockImplementation(async () => {
      callOrder.push('install');
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          progressListener?.({
            state: GoogleBarcodeScannerModuleInstallState.COMPLETED,
          });
          resolve();
        }, 20);
      });
    });

    mockScan.mockImplementation(async () => {
      callOrder.push('scan');
      return {
        barcodes: [{ rawValue: '8690000000012', format: 'EAN_13' }],
      };
    });

    const result = await scanNativeBarcode({ moduleInstallTimeoutMs: 5_000 });
    expect(result.status).toBe('success');
    expect(callOrder.indexOf('addListener')).toBeLessThan(
      callOrder.indexOf('install'),
    );
    expect(callOrder.indexOf('install')).toBeLessThan(
      callOrder.indexOf('scan'),
    );
  });
});

describe('scanNativeBarcode status / cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNativePlatform.mockReturnValue(true);
    mockGetPlatform.mockReturnValue('android');
    mockIsSupported.mockResolvedValue({ supported: true });
    mockIsModuleAvailable.mockResolvedValue({ available: true });
    mockCheckPermissions.mockResolvedValue({ camera: 'granted' });
    mockScan.mockResolvedValue({
      barcodes: [{ rawValue: '8690000000012', format: 'EAN_13' }],
    });
  });

  it('returns unsupported on non-native platforms', async () => {
    mockIsNativePlatform.mockReturnValue(false);
    const result = await scanNativeBarcode();
    expect(result.status).toBe('unsupported');
    expect(mockScan).not.toHaveBeenCalled();
  });

  it('emits camera preparing status then scans when module is ready', async () => {
    const statuses: string[] = [];
    const result = await scanNativeBarcode({
      onStatus: (message) => statuses.push(message),
    });
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.rawValue).toBe('8690000000012');
    }
    expect(statuses).toContain('Kamera hazırlanıyor...');
  });

  it('returns cancelled without treating it as an error', async () => {
    mockScan.mockRejectedValue(new Error('User cancelled'));
    const result = await scanNativeBarcode();
    expect(result).toEqual({ status: 'cancelled' });
  });

  it('returns module install failure as error status', async () => {
    mockIsModuleAvailable.mockResolvedValue({ available: false });
    mockAddListener.mockImplementation(
      async (
        _event: string,
        listener: (event: {
          state: GoogleBarcodeScannerModuleInstallState;
        }) => void,
      ) => {
        queueMicrotask(() => {
          listener({
            state: GoogleBarcodeScannerModuleInstallState.FAILED,
          });
        });
        return { remove: vi.fn(async () => undefined) };
      },
    );
    mockInstallModule.mockResolvedValue(undefined);

    const result = await scanNativeBarcode({ moduleInstallTimeoutMs: 5_000 });
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toMatch(/başarısız/i);
    }
    expect(mockScan).not.toHaveBeenCalled();
  });
});
