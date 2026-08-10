export type BarcodeScanEngineMode = 'native' | 'zxing';

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

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

function getBarcodeDetectorCtor(): BarcodeDetectorConstructor | null {
  if (typeof window === 'undefined') return null;
  const ctor = (
    window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }
  ).BarcodeDetector;
  return ctor ?? null;
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

function createNativeEngine(
  Detector: BarcodeDetectorConstructor,
  options: BarcodeScanEngineOptions,
): BarcodeScanEngine {
  const detector = new Detector({
    formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
  });

  let stream: MediaStream | null = null;
  let rafId = 0;
  let paused = true;
  let stopped = false;
  let detecting = false;

  const tick = (): void => {
    if (stopped || paused) return;
    rafId = window.requestAnimationFrame(() => {
      void (async () => {
        if (stopped || paused || detecting) {
          tick();
          return;
        }
        detecting = true;
        try {
          if (options.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const codes = await detector.detect(options.video);
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              options.onDetect(value);
            }
          }
        } catch {
          // Transient detect errors are ignored; loop continues.
        } finally {
          detecting = false;
          tick();
        }
      })();
    });
  };

  return {
    mode: 'native',
    async start() {
      stopped = false;
      stream = await createCameraStream(options.facingMode ?? 'environment');
      options.video.srcObject = stream;
      options.video.setAttribute('playsinline', 'true');
      options.video.muted = true;
      await options.video.play();
      paused = false;
      tick();
    },
    pause() {
      paused = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
    resume() {
      if (stopped) return;
      paused = false;
      tick();
    },
    stop() {
      stopped = true;
      paused = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      options.video.pause();
      options.video.srcObject = null;
      stopStream(stream);
      stream = null;
    },
  };
}

async function createZxingEngine(
  options: BarcodeScanEngineOptions,
): Promise<BarcodeScanEngine> {
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const reader = new BrowserMultiFormatReader();
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
        const text = result.getText().trim();
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

export async function createBarcodeScanEngine(
  options: BarcodeScanEngineOptions,
): Promise<BarcodeScanEngine> {
  const Detector = getBarcodeDetectorCtor();
  if (Detector) {
    try {
      // Feature-detect: some browsers expose the ctor but throw on construct.
      const probe = new Detector({ formats: ['ean_13'] });
      void probe;
      return createNativeEngine(Detector, options);
    } catch {
      // fall through to ZXing
    }
  }
  return createZxingEngine(options);
}
