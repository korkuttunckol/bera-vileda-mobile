import { ORDER_REPORT_LOGO_PATHS } from './orderReport.constants';

export interface OrderReportLogoAssets {
  beraPngBase64: string;
  viledaPngBase64: string;
}

let cachedLogoAssets: OrderReportLogoAssets | null = null;

async function svgUrlToPngBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const svgText = await response.text();
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);

  try {
    return await new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || 360;
        canvas.height = image.naturalHeight || 96;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Logo dönüştürme başarısız.'));
          return;
        }
        context.drawImage(image, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl.split(',')[1] ?? '');
      };
      image.onerror = () => { reject(new Error('Logo yüklenemedi.')); };
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function loadOrderReportLogoAssets(): Promise<OrderReportLogoAssets> {
  if (cachedLogoAssets) {
    return cachedLogoAssets;
  }

  const [beraPngBase64, viledaPngBase64] = await Promise.all([
    svgUrlToPngBase64(ORDER_REPORT_LOGO_PATHS.bera),
    svgUrlToPngBase64(ORDER_REPORT_LOGO_PATHS.vileda),
  ]);

  cachedLogoAssets = { beraPngBase64, viledaPngBase64 };
  return cachedLogoAssets;
}

export function resolveLogoAssetUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).href;
}

async function waitForImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.onload = () => { resolve(); };
          image.onerror = () => { resolve(); };
        }),
    ),
  );
}

export async function waitForReportDomReady(container: HTMLElement): Promise<void> {
  await waitForImages(container);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { resolve(); });
    });
  });
}
