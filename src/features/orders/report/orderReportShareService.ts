import { ORDER_REPORT_SHARE_TEXT } from './orderReport.constants';

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareGeneratedFiles(
  files: File[],
  options: { whatsapp: boolean },
): Promise<void> {
  if (files.length === 0) {
    return;
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
