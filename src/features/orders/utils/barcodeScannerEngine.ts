import { normalizeScannedBarcodeForLookup } from '@/features/orders/utils/barcodeZxingConfig';

export type BarcodeScanEngineMode = 'zxing' | 'native';

export interface BarcodeScanEngineOptions {
  video: HTMLVideoElement;
  onDetect: (barcode: string) => void;
  /** Prefer rear camera. */
  facingMode?: string;
}

export interface BarcodeScanEngine {
  mode: BarcodeScanEngineMode;
  start: () => Promise<void>;
  /** Pause detection loop; keep camera preview if stream is live. */
  pause: () => void;
  /** Resume detection after confirm/cancel. */
  resume: () => void;
  stop: () => void;
}

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
 * Block until the video element has a real decoded frame size.
 * ZXing creates its capture canvas once from videoWidth/videoHeight —
 * starting earlier freezes a 0×0 canvas and never decodes.
 */
export async function waitForVideoFrameReady(
  video: HTMLVideoElement,
  timeoutMs: number = VIDEO_READY_TIMEOUT_MS,
): Promise<void> {
  if (isVideoFrameReady(video)) return;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const pollId = globalThis.setInterval(() => {
      check();
    }, 50);

    const timeoutId = globalThis.setTimeout(() => {
      finish(() => {
        reject(
          new Error('Kamera görüntüsü hazır olmadı. Lütfen tekrar deneyin.'),
        );
      });
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

    const finish = (action: () => void): void => {
      if (settled) return;
      settled = true;
      globalThis.clearInterval(pollId);
      globalThis.clearTimeout(timeoutId);
      for (const eventName of events) {
        video.removeEventListener(eventName, onEvent);
      }
      action();
    };

    const check = (): void => {
      if (!isVideoFrameReady(video)) return;
      finish(() => {
        resolve();
      });
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
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      throw new Error('Kamera izni reddedildi. Ayarlardan izin verin.');
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      throw new Error('Kullanılabilir kamera bulunamadı.');
    }
    if (name === 'TypeError' || name === 'NotSupportedError') {
      throw new Error('Bu cihazda kamera desteklenmiyor.');
    }
    throw new Error('Kamera açılamadı. Lütfen tekrar deneyin.');
  }
}

/**
 * Primary field scanner: ZXing BrowserMultiFormatReader.
 * Used on Android Chrome and iPhone Safari (BarcodeDetector is not primary).
 *
 * Lifecycle: getUserMedia → attach → play → wait for non-zero frame size →
 * decodeFromVideoElement (avoids decodeFromStream re-attach / 0×0 canvas race).
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
  let loggedUnexpectedDecodeError = false;

  const handleDecode = (result: { getText: () => string } | undefined, error: unknown): void => {
    if (stopped || paused) return;

    if (result) {
      const text = normalizeScannedBarcodeForLookup(result.getText());
      if (text) options.onDetect(text);
      return;
    }

    if (!error) return;
    if (isTransientDecodeError(error)) {
      // NotFound / soft miss — continuous loop must keep running (ZXing retries).
      return;
    }

    if (!loggedUnexpectedDecodeError) {
      loggedUnexpectedDecodeError = true;
      console.warn('[barcode-scanner] unexpected decode error', getErrorName(error), error);
    }
  };

  return {
    mode: 'zxing',
    async start() {
      stopped = false;
      loggedUnexpectedDecodeError = false;
      stream = await createCameraStream(options.facingMode ?? 'environment');
      await tryApplyContinuousFocus(stream);

      options.video.srcObject = stream;
      options.video.setAttribute('playsinline', 'true');
      options.video.muted = true;
      await options.video.play();
      await waitForVideoFrameReady(options.video);

      // stop() may run while awaiting play/metadata (effect cleanup).
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated by stop()
      if (stopped) {
        stopStream(stream);
        stream = null;
        options.video.srcObject = null;
        return;
      }

      // Guard again: ZXing freezes capture canvas size at scan() start.
      if (!isVideoFrameReady(options.video)) {
        throw new Error('Kamera görüntüsü hazır olmadı. Lütfen tekrar deneyin.');
      }

      paused = false;
      controls = await reader.decodeFromVideoElement(
        options.video,
        (result, error) => {
          handleDecode(result ?? undefined, error);
        },
      );
    },
    pause() {
      paused = true;
    },
    resume() {
      if (stopped) return;
      paused = false;
    },
    stop() {
      stopped = true;
      paused = true;
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
