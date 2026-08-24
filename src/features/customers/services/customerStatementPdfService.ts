import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { formatCurrency } from '@/shared/utils/cn';
import type { Customer } from '@/shared/types/customer.types';
import type { LogoCariHareketRow } from './logoCariHareketApiClient';
import { formatLogoDate } from '../utils/logoDateFormat';

const REPORT_WIDTH_PX = 1120;
const PAGE_MARGIN_MM = 10;
// A4'ü daha verimli kullan: ilk sayfada müşteri başlığı bulunduğu için biraz
// daha az, devam sayfalarında ise daha fazla satır gösterilir. Satırlar tek
// satırdır; bu yüzden bu sayılar PDF'in ortasından satır kesmeden dolu görünür.
const FIRST_PAGE_ROW_COUNT = 45;
const FOLLOWING_PAGE_ROW_COUNT = 55;

function asNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const numberValue = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function movementDate(row: LogoCariHareketRow): string {
  return formatLogoDate(row.TARIH) || '—';
}

function singleLine(value: string, maximumLength = 64): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maximumLength ? `${normalized.slice(0, maximumLength - 1)}…` : normalized;
}

function buildFileName(customer: Customer): string {
  const safeCode = customer.code.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  return `hesap-ekstresi-${safeCode || 'cari'}.pdf`;
}

function buildRowsHtml(rows: LogoCariHareketRow[]): string {
  return rows.map((row) => {
    const borc = asNumber(row.BORC);
    const alacak = asNumber(row.ALACAK);
    const documentNo = row.BELGE_NO?.trim() || row.ISLEM_NO?.toString().trim() || '—';
    const isCreditCardCollection = Number(row.FIS_TURU) === 70;
    const description =
      row.ACIKLAMA?.trim() ||
      (isCreditCardCollection ? 'Kredi Kartı Tahsilatı' : undefined) ||
      row.BANKA_ACIKLAMA?.trim() ||
      row.BELGE_NO?.trim() ||
      '—';

    return `
      <tr>
        <td class="date">${escapeHtml(movementDate(row))}</td>
        <td>${escapeHtml(documentNo)}</td>
        <td class="description" title="${escapeHtml(description)}">${escapeHtml(singleLine(description))}</td>
        <td class="amount">${borc > 0 ? escapeHtml(formatCurrency(borc)) : '—'}</td>
        <td class="amount">${alacak > 0 ? escapeHtml(formatCurrency(alacak)) : '—'}</td>
        <td class="amount balance">${escapeHtml(formatCurrency(asNumber(row.BAKIYE)))}</td>
      </tr>
    `;
  }).join('');
}

function buildStatementPageHtml(
  customer: Customer,
  rows: LogoCariHareketRow[],
  includeCustomerHeader: boolean,
  isLastPage: boolean,
  finalBalance: number,
): string {
  const city = customer.address?.city?.trim();
  const rowsHtml = buildRowsHtml(rows);

  return `
    <div class="statement-report-root">
      <style>
        .statement-report-root { box-sizing: border-box; width: ${String(REPORT_WIDTH_PX)}px; min-height: 900px; padding: 27px 28px 32px; background: #fff; color: #1d2939; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.3; }
        .statement-report-root * { box-sizing: border-box; }
        .title { margin: 0; color: #1e3f6b; font-size: 22px; font-weight: 700; letter-spacing: .03em; text-align: center; }
        .subtitle { margin: 5px 0 15px; color: #667085; font-size: 10px; text-align: center; }
        .rule { height: 3px; margin: 0 0 15px; border: 0; background: #1e3f6b; }
        .customer { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 22px; margin-bottom: 16px; padding: 12px 14px; border: 1px solid #cbd5e1; background: #f5f8fa; }
        .field-label { display: block; margin-bottom: 2px; color: #667085; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .field-value { color: #1e3f6b; font-size: 12px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #cbd5e1; padding: 7px 6px; vertical-align: top; word-break: break-word; }
        th { background: #1e3f6b; color: #fff; font-size: 9px; font-weight: 700; text-align: left; }
        td { font-size: 10px; }
        th:nth-child(1) { width: 12%; } th:nth-child(2) { width: 17%; } th:nth-child(3) { width: 38%; } th:nth-child(4), th:nth-child(5), th:nth-child(6) { width: 11%; }
        .date { color: #475467; }
        .description { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .balance { color: #1e3f6b; font-weight: 700; }
        .summary { display: flex; justify-content: flex-end; margin-top: 15px; }
        .summary-box { min-width: 220px; padding: 10px 13px; border: 2px solid #1e3f6b; background: #f5f8fa; color: #1e3f6b; font-size: 12px; font-weight: 700; text-align: right; }
      </style>
      ${includeCustomerHeader ? `
        <h1 class="title">HESAP EKSTRESİ</h1>
        <p class="subtitle">${escapeHtml(new Date().toLocaleString('tr-TR'))} tarihinde oluşturuldu</p>
        <hr class="rule" />
        <section class="customer">
          <div><span class="field-label">Cari kodu</span><span class="field-value">${escapeHtml(customer.code)}</span></div>
          <div><span class="field-label">Şehir</span><span class="field-value">${escapeHtml(city || '—')}</span></div>
          <div style="grid-column: 1 / -1"><span class="field-label">Cari ünvanı</span><span class="field-value">${escapeHtml(customer.name)}</span></div>
        </section>` : ''}
      <table>
        <thead><tr><th>Tarih</th><th>Belge No</th><th>Açıklama</th><th class="amount">Borç</th><th class="amount">Alacak</th><th class="amount">Bakiye</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${isLastPage ? `<div class="summary"><div class="summary-box">Güncel bakiye: ${escapeHtml(formatCurrency(finalBalance))}</div></div>` : ''}
    </div>
  `;
}

function splitRowsForPages(rows: LogoCariHareketRow[]): LogoCariHareketRow[][] {
  const pages: LogoCariHareketRow[][] = [];
  let offset = 0;
  let rowCount = FIRST_PAGE_ROW_COUNT;
  while (offset < rows.length) {
    pages.push(rows.slice(offset, offset + rowCount));
    offset += rowCount;
    rowCount = FOLLOWING_PAGE_ROW_COUNT;
  }
  return pages;
}

function addPageNumbers(pdf: jsPDF): void {
  const pageCount = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${String(page)} / ${String(pageCount)}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  }
}

async function asBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('PDF dosyası hazırlanamadı.'));
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== 'string') {
        reject(new Error('PDF dosyası hazırlanamadı.'));
        return;
      }
      resolve(value.slice(value.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function wasShareCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /abort.*cancell|cancel.*share|share.*cancel/i.test(message);
}

export async function createCustomerStatementPdf(
  customer: Customer,
  rows: LogoCariHareketRow[],
): Promise<File> {
  if (rows.length === 0) throw new Error('PDF için hesap hareketi bulunamadı.');

  try {
    if (document.fonts) await document.fonts.ready;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const printableWidth = pdf.internal.pageSize.getWidth() - PAGE_MARGIN_MM * 2;
    const pages = splitRowsForPages(rows);
    const finalBalance = asNumber(rows.at(-1)?.BAKIYE);

    for (let index = 0; index < pages.length; index += 1) {
      const host = document.createElement('div');
      // Keeping opacity at 1 is essential: a nearly transparent report produces a blank PDF on iOS.
      host.style.cssText = `position:fixed;top:0;left:0;width:${String(REPORT_WIDTH_PX)}px;opacity:1;pointer-events:none;z-index:-1;background:#fff;`;
      host.innerHTML = buildStatementPageHtml(
        customer,
        pages[index],
        index === 0,
        index === pages.length - 1,
        finalBalance,
      );
      document.body.appendChild(host);
      try {
        const root = host.querySelector('.statement-report-root');
        if (!(root instanceof HTMLElement)) throw new Error('PDF şablonu oluşturulamadı.');
        const canvas = await html2canvas(root, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
          width: REPORT_WIDTH_PX,
          windowWidth: REPORT_WIDTH_PX,
          scrollX: 0,
          scrollY: 0,
        });
        if (canvas.width < 2 || canvas.height < 2) throw new Error('PDF görseli oluşturulamadı.');
        const renderedHeight = (canvas.height * printableWidth) / canvas.width;
        if (renderedHeight > 277) throw new Error('PDF sayfa düzeni beklenenden uzun.');
        if (index > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', PAGE_MARGIN_MM, PAGE_MARGIN_MM, printableWidth, renderedHeight);
      } finally {
        host.remove();
      }
    }

    addPageNumbers(pdf);
    return new File([pdf.output('blob')], buildFileName(customer), { type: 'application/pdf' });
  } finally {
    // Each temporary report node is removed immediately after its page is captured.
  }
}

export async function shareCustomerStatementPdf(
  customer: Customer,
  rows: LogoCariHareketRow[],
): Promise<boolean> {
  const file = await createCustomerStatementPdf(customer, rows);

  if (Capacitor.isNativePlatform()) {
    const savedFile = await Filesystem.writeFile({
      path: `ekstreler/${file.name}`,
      data: await asBase64(file),
      directory: Directory.Cache,
      recursive: true,
    });
    const canShare = await Share.canShare();
    if (canShare.value) {
      try {
        await Share.share({
          title: 'Hesap Ekstresi',
          text: `${customer.code} hesap ekstresi`,
          files: [savedFile.uri],
        });
        return true;
      } catch (error) {
        if (wasShareCancelled(error)) return false;
        throw error;
      }
    }
    downloadFile(file);
    return true;
  }

  const shareData = { files: [file] };
  if ('share' in navigator && navigator.canShare?.(shareData)) {
    try {
      await navigator.share({ title: 'Hesap Ekstresi', text: `${customer.code} hesap ekstresi`, files: [file] });
      return true;
    } catch (error) {
      if (wasShareCancelled(error)) return false;
      // A browser can lose the user gesture while a large PDF is being prepared.
      // In that case, continue with the normal download path instead of surfacing an error.
    }
  }
  downloadFile(file);
  return true;
}
