import { ORDER_REPORT_SHARE_TEXT } from './orderReport.constants';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function asBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => { reject(new Error('Rapor dosyası hazırlanamadı.')); };
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Rapor dosyası hazırlanamadı.'));
        return;
      }
      resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

function wasShareCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /abort.*cancell|cancel.*share|share.*cancel/i.test(message);
}

export async function shareGeneratedFiles(
  files: File[],
  options: { whatsapp: boolean },
): Promise<void> {
  if (files.length === 0) {
    return;
  }

  // iOS/Android uygulamasında <a download> dosyayı açmaz. Raporu önce Cache'e
  // yazıp işletim sisteminin dosya paylaşım ekranına gönderiyoruz.
  if (Capacitor.isNativePlatform()) {
    const savedFiles = await Promise.all(files.map(async (file) => Filesystem.writeFile({
      path: `bera-raporlar/${file.name}`,
      data: await asBase64(file),
      directory: Directory.Cache,
      recursive: true,
    })));
    const canShare = await Share.canShare();
    if (canShare.value) {
      try {
        await Share.share({
          title: 'BERA Raporu',
          text: options.whatsapp ? ORDER_REPORT_SHARE_TEXT : 'BERA raporu',
          files: savedFiles.map((file) => file.uri),
        });
        return;
      } catch (error) {
        if (wasShareCancelled(error)) return;
        throw error;
      }
    }
  }

  if (options.whatsapp && 'share' in navigator) {
    const shareData = { files };
    if (navigator.canShare(shareData)) {
      await navigator.share({
        title: 'Sipariş Raporu',
        text: ORDER_REPORT_SHARE_TEXT,
        files,
      });
      return;
    }
  }

  for (const file of files) {
    downloadFile(file);
  }

  if (options.whatsapp) {
    const text = encodeURIComponent(ORDER_REPORT_SHARE_TEXT);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }
}

export function openPrintPreview(_files: File[]): void {
  // İleride: yazdırma entegrasyonu
}

export function sendByEmail(_files: File[]): void {
  // İleride: e-posta entegrasyonu
}

/**
 * Logo GO Wings aktarım dosyasını indirir / paylaşır.
 * Web Share destekleniyorsa dosyayı paylaşım sayfasına açar; aksi halde indirir.
 */
export async function exportToLogoGoWings(files: File[]): Promise<void> {
  if (files.length === 0) {
    throw new Error('Logo GO Wings için aktarım dosyası bulunamadı.');
  }

  await shareGeneratedFiles(files, { whatsapp: false });
}
