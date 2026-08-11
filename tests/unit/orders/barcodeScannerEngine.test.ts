import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCameraVideoConstraints,
  buildFallbackCameraVideoConstraints,
  isTransientDecodeError,
  isVideoFrameReady,
  waitForVideoFrameReady,
} from '@/features/orders/utils/barcodeScannerEngine';

function makeVideo(
  overrides: Partial<{
    readyState: number;
    videoWidth: number;
    videoHeight: number;
  }> = {},
): HTMLVideoElement {
  const listeners = new Map<string, Set<() => void>>();
  const video = {
    readyState: overrides.readyState ?? 0,
    videoWidth: overrides.videoWidth ?? 0,
    videoHeight: overrides.videoHeight ?? 0,
    addEventListener: (type: string, handler: () => void) => {
      const set = listeners.get(type) ?? new Set();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, handler: () => void) => {
      listeners.get(type)?.delete(handler);
    },
    dispatch: (type: string) => {
      for (const handler of listeners.get(type) ?? []) handler();
    },
  };
  return video as unknown as HTMLVideoElement & { dispatch: (t: string) => void };
}

describe('video frame readiness helpers', () => {
  it('isVideoFrameReady requires readyState and non-zero dimensions', () => {
    expect(
      isVideoFrameReady(
        makeVideo({ readyState: 2, videoWidth: 0, videoHeight: 480 }),
      ),
    ).toBe(false);
    expect(
      isVideoFrameReady(
        makeVideo({ readyState: 1, videoWidth: 640, videoHeight: 480 }),
      ),
    ).toBe(false);
    expect(
      isVideoFrameReady(
        makeVideo({ readyState: 2, videoWidth: 640, videoHeight: 480 }),
      ),
    ).toBe(true);
  });

  it('waitForVideoFrameReady resolves true when dimensions become ready', async () => {
    const video = makeVideo({
      readyState: 0,
      videoWidth: 0,
      videoHeight: 0,
    }) as HTMLVideoElement & { dispatch: (t: string) => void };

    const pending = waitForVideoFrameReady(video, 2_000);

    (video as unknown as { readyState: number }).readyState = 2;
    (video as unknown as { videoWidth: number }).videoWidth = 640;
    (video as unknown as { videoHeight: number }).videoHeight = 480;
    video.dispatch('loadedmetadata');

    await expect(pending).resolves.toBe(true);
  });

  it('waitForVideoFrameReady resolves false on timeout (non-fatal)', async () => {
    const video = makeVideo();
    await expect(waitForVideoFrameReady(video, 80)).resolves.toBe(false);
  });
});

describe('buildCameraVideoConstraints', () => {
  it('prefers rear camera and modest ideal resolution', () => {
    const constraints = buildCameraVideoConstraints('environment');
    expect(constraints.facingMode).toEqual({ ideal: 'environment' });
    expect(constraints.width).toEqual({ ideal: 640 });
    expect(constraints.height).toEqual({ ideal: 480 });
  });

  it('fallback omits width/height ideals', () => {
    expect(buildFallbackCameraVideoConstraints('environment')).toEqual({
      facingMode: { ideal: 'environment' },
    });
  });
});

describe('isTransientDecodeError', () => {
  it('treats NotFoundException as non-fatal', () => {
    expect(isTransientDecodeError({ name: 'NotFoundException' })).toBe(true);
    expect(isTransientDecodeError({ name: 'ChecksumException' })).toBe(true);
    expect(isTransientDecodeError({ name: 'FormatException' })).toBe(true);
    expect(isTransientDecodeError({ name: 'TypeError' })).toBe(false);
  });
});

function stubSecureWindow(): void {
  vi.stubGlobal('window', {
    isSecureContext: true,
    location: { hostname: 'localhost' },
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
  });
}

function makeTrack(stop = vi.fn()) {
  return {
    stop,
    getCapabilities: () => ({ focusMode: ['continuous'] }),
    applyConstraints: vi.fn(async () => undefined),
    getSettings: () => ({
      width: 640,
      height: 480,
      facingMode: 'environment',
    }),
  };
}

describe('createBarcodeScanEngine lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('@zxing/browser');
  });

  it('opens preview even when video frame is not ready yet', async () => {
    const decodeFromVideoElement = vi.fn(async () => ({ stop: vi.fn() }));
    const decodeFromCanvas = vi.fn();

    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        decodeFromVideoElement = decodeFromVideoElement;
        decodeFromCanvas = decodeFromCanvas;
        reset = vi.fn();
      },
    }));

    const trackStop = vi.fn();
    stubSecureWindow();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [makeTrack(trackStop)],
          getVideoTracks: () => [makeTrack(trackStop)],
        })),
      },
    });

    const { createBarcodeScanEngine } = await import(
      '@/features/orders/utils/barcodeScannerEngine'
    );

    const videoState = {
      readyState: 0,
      videoWidth: 0,
      videoHeight: 0,
      srcObject: null as MediaStream | null,
      muted: false,
    };

    const video = {
      get readyState() {
        return videoState.readyState;
      },
      get videoWidth() {
        return videoState.videoWidth;
      },
      get videoHeight() {
        return videoState.videoHeight;
      },
      get srcObject() {
        return videoState.srcObject;
      },
      set srcObject(value: MediaStream | null) {
        videoState.srcObject = value;
      },
      get muted() {
        return videoState.muted;
      },
      set muted(value: boolean) {
        videoState.muted = value;
      },
      setAttribute: vi.fn(),
      play: vi.fn(async () => undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    const engine = await createBarcodeScanEngine({
      video,
      onDetect: vi.fn(),
      facingMode: 'environment',
    });

    await engine.start();

    expect(video.srcObject).not.toBeNull();
    expect(engine.isPreviewLive()).toBe(true);
    // Continuous decode waits for frame size — must not block preview.
    expect(decodeFromVideoElement).not.toHaveBeenCalled();

    engine.stop();
    expect(trackStop).toHaveBeenCalled();
    expect(engine.isPreviewLive()).toBe(false);
  });

  it('frame-ready timeout is non-fatal: preview stays live for manual scan', async () => {
    vi.useFakeTimers();
    const decodeFromVideoElement = vi.fn(async () => ({ stop: vi.fn() }));
    const decodeFromCanvas = vi.fn(() => {
      const err = new Error('NotFoundException');
      err.name = 'NotFoundException';
      throw err;
    });

    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        decodeFromVideoElement = decodeFromVideoElement;
        decodeFromCanvas = decodeFromCanvas;
        reset = vi.fn();
      },
    }));

    stubSecureWindow();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [makeTrack()],
          getVideoTracks: () => [makeTrack()],
        })),
      },
    });

    const { createBarcodeScanEngine } = await import(
      '@/features/orders/utils/barcodeScannerEngine'
    );

    const video = {
      readyState: 0,
      videoWidth: 0,
      videoHeight: 0,
      srcObject: null as MediaStream | null,
      muted: false,
      setAttribute: vi.fn(),
      play: vi.fn(async () => undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    const engine = await createBarcodeScanEngine({
      video,
      onDetect: vi.fn(),
    });

    await engine.start();
    expect(engine.isPreviewLive()).toBe(true);

    await vi.advanceTimersByTimeAsync(11_000);
    expect(decodeFromVideoElement).not.toHaveBeenCalled();
    expect(engine.isPreviewLive()).toBe(true);

    // Manual scan while dimensions still missing → not_ready, camera stays open.
    await expect(engine.scanOnce()).resolves.toEqual({ status: 'not_ready' });
    expect(engine.isPreviewLive()).toBe(true);

    engine.stop();
    vi.useRealTimers();
  });

  it('starts continuous decode after frames are ready and detects', async () => {
    const decodeFromVideoElement = vi.fn(
      async (
        _video: HTMLVideoElement,
        callback: (
          result?: { getText: () => string },
          error?: unknown,
        ) => void,
      ) => {
        callback(undefined, { name: 'NotFoundException' });
        callback({ getText: () => '8690123456788' }, undefined);
        return { stop: vi.fn() };
      },
    );

    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        decodeFromVideoElement = decodeFromVideoElement;
        decodeFromCanvas = vi.fn();
        reset = vi.fn();
      },
    }));

    stubSecureWindow();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [makeTrack()],
          getVideoTracks: () => [makeTrack()],
        })),
      },
    });

    const { createBarcodeScanEngine } = await import(
      '@/features/orders/utils/barcodeScannerEngine'
    );

    const listeners = new Map<string, Set<() => void>>();
    const videoState = {
      readyState: 0,
      videoWidth: 0,
      videoHeight: 0,
      srcObject: null as MediaStream | null,
      muted: false,
    };

    const video = {
      get readyState() {
        return videoState.readyState;
      },
      get videoWidth() {
        return videoState.videoWidth;
      },
      get videoHeight() {
        return videoState.videoHeight;
      },
      get srcObject() {
        return videoState.srcObject;
      },
      set srcObject(value: MediaStream | null) {
        videoState.srcObject = value;
      },
      get muted() {
        return videoState.muted;
      },
      set muted(value: boolean) {
        videoState.muted = value;
      },
      setAttribute: vi.fn(),
      play: vi.fn(async () => {
        videoState.readyState = 2;
        videoState.videoWidth = 640;
        videoState.videoHeight = 480;
        for (const handler of listeners.get('loadeddata') ?? []) handler();
      }),
      pause: vi.fn(),
      addEventListener: (type: string, handler: () => void) => {
        const set = listeners.get(type) ?? new Set();
        set.add(handler);
        listeners.set(type, set);
      },
      removeEventListener: (type: string, handler: () => void) => {
        listeners.get(type)?.delete(handler);
      },
    } as unknown as HTMLVideoElement;

    const onDetect = vi.fn();
    const engine = await createBarcodeScanEngine({
      video,
      onDetect,
      facingMode: 'environment',
    });

    await engine.start();
    // Allow background continuous start to settle.
    await vi.waitFor(() => {
      expect(decodeFromVideoElement).toHaveBeenCalledTimes(1);
    });
    expect(onDetect).toHaveBeenCalledWith('8690123456788');
  });

  it('manual scanOnce success returns barcode without stopping preview', async () => {
    const stopControls = vi.fn();
    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        decodeFromVideoElement = vi.fn(async () => ({ stop: stopControls }));
        decodeFromCanvas = vi.fn(() => ({
          getText: () => '8690123456788',
          getBarcodeFormat: () => 7, // BarcodeFormat.EAN_13
        }));
        reset = vi.fn();
      },
    }));

    stubSecureWindow();
    const trackStop = vi.fn();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [makeTrack(trackStop)],
          getVideoTracks: () => [makeTrack(trackStop)],
        })),
      },
    });

    const drawImage = vi.fn();
    const getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray([12, 34, 56, 255]),
    }));
    vi.stubGlobal('document', {
      createElement: (tag: string) => {
        if (tag !== 'canvas') throw new Error(`unexpected ${tag}`);
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage, getImageData }),
          toDataURL: () => 'data:image/jpeg;base64,xx',
        };
      },
    });

    const { createBarcodeScanEngine } = await import(
      '@/features/orders/utils/barcodeScannerEngine'
    );

    const video = {
      readyState: 2,
      videoWidth: 640,
      videoHeight: 480,
      srcObject: null as MediaStream | null,
      muted: false,
      setAttribute: vi.fn(),
      play: vi.fn(async () => undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    const engine = await createBarcodeScanEngine({
      video,
      onDetect: vi.fn(),
    });
    await engine.start();

    await expect(engine.scanOnce()).resolves.toEqual({
      status: 'detected',
      barcode: '8690123456788',
    });
    expect(engine.isPreviewLive()).toBe(true);
    expect(trackStop).not.toHaveBeenCalled();

    const debugResult = await engine.scanOnce({ includeDebug: true });
    expect(debugResult.status).toBe('detected');
    expect(debugResult.debug?.decode.status).toBe('success');
    expect(debugResult.debug?.rawBarcode).toBe('8690123456788');
    expect(debugResult.debug?.normalizedBarcode).toBe('8690123456788');
    expect(debugResult.debug?.capture.canvasWidth).toBe(640);
    expect(debugResult.debug?.lookup).toBe('skipped');
  });

  it('manual scanOnce miss keeps camera open', async () => {
    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        decodeFromVideoElement = vi.fn(async () => ({ stop: vi.fn() }));
        decodeFromCanvas = vi.fn(() => {
          const err = new Error('NotFoundException');
          err.name = 'NotFoundException';
          throw err;
        });
        reset = vi.fn();
      },
    }));

    stubSecureWindow();
    const trackStop = vi.fn();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [makeTrack(trackStop)],
          getVideoTracks: () => [makeTrack(trackStop)],
        })),
      },
    });
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: vi.fn(),
          getImageData: () => ({
            data: new Uint8ClampedArray([1, 2, 3, 255]),
          }),
        }),
        toDataURL: () => 'data:image/jpeg;base64,yy',
      }),
    });

    const { createBarcodeScanEngine } = await import(
      '@/features/orders/utils/barcodeScannerEngine'
    );

    const video = {
      readyState: 2,
      videoWidth: 640,
      videoHeight: 480,
      srcObject: null as MediaStream | null,
      muted: false,
      setAttribute: vi.fn(),
      play: vi.fn(async () => undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    const engine = await createBarcodeScanEngine({
      video,
      onDetect: vi.fn(),
    });
    await engine.start();

    await expect(engine.scanOnce()).resolves.toEqual({ status: 'not_found' });
    expect(engine.isPreviewLive()).toBe(true);
    expect(trackStop).not.toHaveBeenCalled();

    const debugMiss = await engine.scanOnce({ includeDebug: true });
    expect(debugMiss.status).toBe('not_found');
    expect(debugMiss.debug?.decode.status).toBe('NotFoundException');
    expect(debugMiss.debug?.rawBarcode).toBeNull();
    expect(debugMiss.debug?.lookup).toBe('skipped');

    engine.stop();
    expect(trackStop).toHaveBeenCalled();
  });

  it('always returns zxing mode even when BarcodeDetector exists', async () => {
    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        decodeFromVideoElement = vi.fn(async () => ({ stop: vi.fn() }));
        decodeFromCanvas = vi.fn();
        reset = vi.fn();
      },
    }));

    stubSecureWindow();
    vi.stubGlobal('BarcodeDetector', class {
      detect = vi.fn(async () => []);
    });
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [makeTrack()],
          getVideoTracks: () => [makeTrack()],
        })),
      },
    });

    const { createBarcodeScanEngine } = await import(
      '@/features/orders/utils/barcodeScannerEngine'
    );

    const video = {
      readyState: 2,
      videoWidth: 640,
      videoHeight: 480,
      srcObject: null,
      muted: false,
      setAttribute: vi.fn(),
      play: vi.fn(async () => undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    const engine = await createBarcodeScanEngine({
      video,
      onDetect: vi.fn(),
      facingMode: 'environment',
    });

    expect(engine.mode).toBe('zxing');
  });
});
