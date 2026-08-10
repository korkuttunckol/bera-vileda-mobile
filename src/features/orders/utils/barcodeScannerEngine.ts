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

function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

async function createCameraStream(facingMode: string): Promise<MediaStream> {
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    throw new Error('Kamera için güvenli bağlantı (HTTPS) gerekir.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
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

  return {
    mode: 'zxing',
    async start() {
      stopped = false;
      stream = await createCameraStream(options.facingMode ?? 'environment');
      options.video.srcObject = stream;
      options.video.setAttribute('playsinline', 'true');
      options.video.muted = true;
      await options.video.play();
      paused = false;
      controls = await reader.decodeFromStream(stream, options.video, (result) => {
        if (stopped || paused || !result) return;
        const text = normalizeScannedBarcodeForLookup(result.getText());
        if (text) options.onDetect(text);
      });
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
