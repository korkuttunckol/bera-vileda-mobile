import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCameraVideoConstraints,
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

  it('waitForVideoFrameReady does not resolve until dimensions are ready', async () => {
    const video = makeVideo({
      readyState: 0,
      videoWidth: 0,
      videoHeight: 0,
    }) as HTMLVideoElement & { dispatch: (t: string) => void };

    let resolved = false;
    const pending = waitForVideoFrameReady(video, 2_000).then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    (video as unknown as { readyState: number }).readyState = 2;
    (video as unknown as { videoWidth: number }).videoWidth = 640;
    (video as unknown as { videoHeight: number }).videoHeight = 480;
    video.dispatch('loadedmetadata');

    await pending;
    expect(resolved).toBe(true);
  });

  it('waitForVideoFrameReady rejects on timeout when never ready', async () => {
    const video = makeVideo();
    await expect(waitForVideoFrameReady(video, 80)).rejects.toThrow(
      /Kamera görüntüsü hazır olmadı/,
    );
  });
});

describe('buildCameraVideoConstraints', () => {
  it('prefers rear camera and modest ideal resolution', () => {
    const constraints = buildCameraVideoConstraints('environment');
    expect(constraints.facingMode).toEqual({ ideal: 'environment' });
    expect(constraints.width).toEqual({ ideal: 640 });
    expect(constraints.height).toEqual({ ideal: 480 });
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

describe('createBarcodeScanEngine lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('@zxing/browser');
  });

  it('does not start decoder before video dimensions are ready, then starts and detects', async () => {
    const decodeFromVideoElement = vi.fn(
      async (
        _video: HTMLVideoElement,
        callback: (
          result?: { getText: () => string },
          error?: unknown,
        ) => void,
      ) => {
        // Simulate continuous loop: transient miss then success
        callback(undefined, { name: 'NotFoundException' });
        callback({ getText: () => '8690123456788' }, undefined);
        return { stop: vi.fn() };
      },
    );

    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        decodeFromVideoElement = decodeFromVideoElement;
        reset = vi.fn();
      },
    }));

    const trackStop = vi.fn();
    const applyConstraints = vi.fn(async () => undefined);
    vi.stubGlobal('window', {
      isSecureContext: true,
      location: { hostname: 'localhost' },
      setInterval,
      clearInterval,
      setTimeout,
      clearTimeout,
    });
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [
            {
              stop: trackStop,
              getCapabilities: () => ({ focusMode: ['continuous'] }),
              applyConstraints,
            },
          ],
          getVideoTracks: () => [
            {
              stop: trackStop,
              getCapabilities: () => ({ focusMode: ['continuous'] }),
              applyConstraints,
            },
          ],
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
        // Dimensions become available only after play (Android-like timing).
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

    expect(engine.mode).toBe('zxing');
    expect(decodeFromVideoElement).not.toHaveBeenCalled();

    await engine.start();

    expect(decodeFromVideoElement).toHaveBeenCalledTimes(1);
    expect(applyConstraints).toHaveBeenCalled();
    expect(onDetect).toHaveBeenCalledWith('8690123456788');
  });

  it('keeps scanner running after NotFoundException (no onDetect)', async () => {
    let decodeCallback:
      | ((
          result?: { getText: () => string },
          error?: unknown,
        ) => void)
      | null = null;
    const stop = vi.fn();

    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        decodeFromVideoElement = vi.fn(
          async (
            _video: HTMLVideoElement,
            callback: (
              result?: { getText: () => string },
              error?: unknown,
            ) => void,
          ) => {
            decodeCallback = callback;
            return { stop };
          },
        );
        reset = vi.fn();
      },
    }));

    vi.stubGlobal('window', {
      isSecureContext: true,
      location: { hostname: 'localhost' },
      setInterval,
      clearInterval,
      setTimeout,
      clearTimeout,
    });
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }],
          getVideoTracks: () => [
            {
              stop: vi.fn(),
              getCapabilities: () => ({}),
              applyConstraints: vi.fn(),
            },
          ],
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

    const onDetect = vi.fn();
    const engine = await createBarcodeScanEngine({ video, onDetect });
    await engine.start();

    expect(decodeCallback).not.toBeNull();
    decodeCallback?.(undefined, { name: 'NotFoundException' });
    decodeCallback?.(undefined, { name: 'NotFoundException' });
    expect(onDetect).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();

    decodeCallback?.({ getText: () => ' 8690123456788 ' }, undefined);
    expect(onDetect).toHaveBeenCalledWith('8690123456788');
  });

  it('always returns zxing mode even when BarcodeDetector exists', async () => {
    vi.doMock('@zxing/browser', () => ({
      BrowserMultiFormatReader: class {
        decodeFromVideoElement = vi.fn(async () => ({ stop: vi.fn() }));
        reset = vi.fn();
      },
    }));

    vi.stubGlobal('BarcodeDetector', class {
      detect = vi.fn(async () => []);
    });
    vi.stubGlobal('window', {
      isSecureContext: true,
      location: { hostname: 'localhost' },
      setInterval,
      clearInterval,
      setTimeout,
      clearTimeout,
      BarcodeDetector: class {
        detect = vi.fn(async () => []);
      },
    });
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }],
          getVideoTracks: () => [{ stop: vi.fn() }],
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
