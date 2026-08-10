import { normalizeScannedBarcodeForLookup } from '@/features/orders/utils/barcodeZxingConfig';

export type BarcodeScanEngineMode = 'zxing' | 'native';

export type ManualScanResult =
  | { status: 'detected'; barcode: string }
  | { status: 'not_found' }
  | { status: 'not_ready' };

export interface BarcodeScanEngineOptions {
  video: HTMLVideoElement;
  onDetect: (barcode: string) => void;
  /** Prefer rear camera. */
  facingMode?: string;
}

export interface BarcodeScanEngine {
  mode: BarcodeScanEngineMode;
  /** Open camera preview immediately. Continuous decode starts later if/when frames are ready. */
  start: () => Promise<void>;
  /** Pause continuous detection; keep camera preview if stream is live. */
  pause: () => void;
  /** Resume continuous detection after confirm/cancel. */
  resume: () => void;
  /** Single-frame decode from the live preview (independent of continuous loop). */
  scanOnce: () => Promise<ManualScanResult>;
  /** True while MediaStream is attached (preview may be live). */
  isPreviewLive: () => boolean;
  stop: () => void;
}

export const MANUAL_SCAN_MISS_TOAST =
  'Barkod algılanamadı. Barkodu çerçeve içine alıp tekrar deneyin.';

export const MANUAL_SCAN_NOT_READY_TOAST =
  'Kamera görüntüsü henüz hazır değil. Bir saniye bekleyip tekrar deneyin.';

const VIDEO_READY_TIMEOUT_MS = 10_000;

/** Stable barcode-friendly capture size for Android Chrome (avoid needless 1080p+). */
export function buildCameraVideoConstraints(
  facingMode: string,
): MediaTrackConstraints {
  return {
    facingMode: { ideal: facingMode },
    width: { ideal: 640 },
    height: { ideal: 480 },
  };
}

/** Minimal rear-camera constraints when ideal width/height are rejected. */
export function buildFallbackCameraVideoConstraints(
  facingMode: string,
): MediaTrackConstraints {
  return {
    facingMode: { ideal: facingMode },
  };
}

/** HTMLMediaElement.HAVE_CURRENT_DATA — numeric for Node/Vitest without DOM globals. */
const HAVE_CURRENT_DATA = 2;

export function isVideoFrameReady(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

/**
 * Wait until the video element has a real decoded frame size.
 * Returns false on timeout — never throws for slow Android metadata.
 */
export async function waitForVideoFrameReady(
  video: HTMLVideoElement,
  timeoutMs: number = VIDEO_READY_TIMEOUT_MS,
): Promise<boolean> {
  if (isVideoFrameReady(video)) return true;

  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const pollId = globalThis.setInterval(() => {
      check();
    }, 50);

    const timeoutId = globalThis.setTimeout(() => {
      finish(false);
    }, timeoutMs);

    const events = [
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'playing',
      'resize',
    ] as const;

    const onEvent = (): void => {
      check();
    };

    const finish = (ready: boolean): void => {
      if (settled) return;
      settled = true;
      globalThis.clearInterval(pollId);
      globalThis.clearTimeout(timeoutId);
      for (const eventName of events) {
        video.removeEventListener(eventName, onEvent);
      }
      resolve(ready);
    };

    const check = (): void => {
      if (!isVideoFrameReady(video)) return;
      finish(true);
    };

    for (const eventName of events) {
      video.addEventListener(eventName, onEvent);
    }
    check();
  });
}

function getErrorName(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const withName = error as { name?: unknown; constructor?: { name?: string } };
  if (typeof withName.name === 'string' && withName.name.length > 0) {
    return withName.name;
  }
  return withName.constructor?.name ?? '';
}

/** ZXing expected "no barcode in this frame" / soft decode misses — keep scanning. */
export function isTransientDecodeError(error: unknown): boolean {
  const name = getErrorName(error);
  return (
    name === 'NotFoundException' ||
    name === 'ChecksumException' ||
    name === 'FormatException'
  );
}

function mapGetUserMediaError(error: unknown): Error {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return new Error('Kamera izni reddedildi. Ayarlardan izin verin.');
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return new Error('Kullanılabilir kamera bulunamadı.');
  }
  if (name === 'TypeError' || name === 'NotSupportedError') {
    return new Error('Bu cihazda kamera desteklenmiyor.');
  }
  return new Error('Kamera açılamadı. Lütfen tekrar deneyin.');
}

function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

async function tryApplyContinuousFocus(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0] as MediaStreamTrack | undefined;
  if (!track) return;

  try {
    const capabilities = (
      typeof track.getCapabilities === 'function'
        ? track.getCapabilities()
        : {}
    ) as MediaTrackCapabilities & { focusMode?: string[] };
    const modes = capabilities.focusMode;
    if (!modes?.includes('continuous')) return;
    await track.applyConstraints({
      advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
    });
  } catch {
    // Android/Chrome may advertise or reject focusMode — never fail start.
  }
}

async function createCameraStream(facingMode: string): Promise<MediaStream> {
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    throw new Error('Kamera için güvenli bağlantı (HTTPS) gerekir.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: buildCameraVideoConstraints(facingMode),
    });
  } catch (primaryError) {
    // Soft ideals can still Overconstrain on some Android Chrome builds — retry minimal.
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: buildFallbackCameraVideoConstraints(facingMode),
      });
    } catch {
      throw mapGetUserMediaError(primaryError);
    }
  }
}

function captureVideoFrameToCanvas(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Primary field scanner: ZXing BrowserMultiFormatReader.
 *
 * Lifecycle:
 * 1) getUserMedia → attach → play → preview is live (start resolves)
 * 2) when frame size is ready → continuous decodeFromVideoElement (soft; timeout OK)
 * 3) scanOnce always available from live preview for manual "BARKODU TARA"
 */
async function createZxingEngine(
  options: BarcodeScanEngineOptions,
): Promise<BarcodeScanEngine> {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
    await Promise.all([import('@zxing/browser'), import('@zxing/library')]);

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints);
  let stream: MediaStream | null = null;
  let controls: { stop: () => void } | null = null;
  let paused = true;
  let stopped = false;
  let continuousStarted = false;
  let loggedUnexpectedDecodeError = false;

  const handleDecode = (
    result: { getText: () => string } | undefined,
    error: unknown,
  ): void => {
    if (stopped || paused) return;

    if (result) {
      const text = normalizeScannedBarcodeForLookup(result.getText());
      if (text) options.onDetect(text);
      return;
    }

    if (!error) return;
    if (isTransientDecodeError(error)) return;

    if (!loggedUnexpectedDecodeError) {
      loggedUnexpectedDecodeError = true;
      console.warn(
        '[barcode-scanner] unexpected decode error',
        getErrorName(error),
        error,
      );
    }
  };

  const startContinuousDecodeWhenReady = (): void => {
    void (async () => {
      const ready = await waitForVideoFrameReady(options.video);
      if (stopped || !ready || continuousStarted) return;
      if (!isVideoFrameReady(options.video)) return;

      continuousStarted = true;
      paused = false;
      try {
        controls = await reader.decodeFromVideoElement(
          options.video,
          (result, error) => {
            handleDecode(result ?? undefined, error);
          },
        );
      } catch (error) {
        continuousStarted = false;
        console.warn('[barcode-scanner] continuous decode failed to start', error);
      }
    })();
  };

  return {
    mode: 'zxing',
    async start() {
      stopped = false;
      continuousStarted = false;
      loggedUnexpectedDecodeError = false;
      paused = true;

      stream = await createCameraStream(options.facingMode ?? 'environment');
      await tryApplyContinuousFocus(stream);

      options.video.srcObject = stream;
      options.video.setAttribute('playsinline', 'true');
      options.video.muted = true;
      try {
        await options.video.play();
      } catch (error) {
        stopStream(stream);
        stream = null;
        options.video.srcObject = null;
        throw mapGetUserMediaError(error);
      }

      // stop() may run while awaiting play (effect cleanup).
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated by stop()
      if (stopped) {
        stopStream(stream);
        stream = null;
        options.video.srcObject = null;
        return;
      }

      // Preview is live now — do not block on metadata / continuous decode.
      startContinuousDecodeWhenReady();
    },
    pause() {
      paused = true;
    },
    resume() {
      if (stopped) return;
      paused = false;
    },
    scanOnce(): Promise<ManualScanResult> {
      if (stopped || !stream) return Promise.resolve({ status: 'not_ready' });
      if (!isVideoFrameReady(options.video)) {
        return Promise.resolve({ status: 'not_ready' });
      }

      try {
        const canvas = captureVideoFrameToCanvas(options.video);
        const result = reader.decodeFromCanvas(canvas);
        const text = normalizeScannedBarcodeForLookup(result.getText());
        if (!text) return Promise.resolve({ status: 'not_found' });
        return Promise.resolve({ status: 'detected', barcode: text });
      } catch (error) {
        if (isTransientDecodeError(error)) {
          return Promise.resolve({ status: 'not_found' });
        }
        console.warn(
          '[barcode-scanner] manual scan error',
          getErrorName(error),
          error,
        );
        return Promise.resolve({ status: 'not_found' });
      }
    },
    isPreviewLive() {
      return !stopped && stream != null;
    },
    stop() {
      stopped = true;
      paused = true;
      continuousStarted = false;
      try {
        controls?.stop();
      } catch {
        // ignore
      }
      controls = null;
      const resettable = reader as { reset?: () => void };
      try {
        resettable.reset?.();
      } catch {
        // ignore
      }
      options.video.pause();
      options.video.srcObject = null;
      stopStream(stream);
      stream = null;
    },
  };
}

/**
 * Always uses ZXing so Android Chrome never gets stuck on native BarcodeDetector.
 * Native BarcodeDetector path is intentionally not selected here.
 */
export async function createBarcodeScanEngine(
  options: BarcodeScanEngineOptions,
): Promise<BarcodeScanEngine> {
  return createZxingEngine(options);
}
