import { jsPDF } from 'jspdf';
import { buildOrderReportHtml } from './orderReportHtmlTemplate';
import type { BulkOrderReport } from '../orderReport.types';

function mountReportElement(html: string): HTMLDivElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

export async function renderOrderReportPdf(report: BulkOrderReport): Promise<Blob> {
  const html = buildOrderReportHtml(report);
  const container = mountReportElement(html);

  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    await doc.html(container, {
      margin: [10, 10, 12, 10],
      autoPaging: 'text',
      width: 190,
      windowWidth: 794,
      html2canvas: {
        scale: 0.264583,
        useCORS: true,
        logging: false,
      },
    });

    return doc.output('blob');
  } finally {
    container.remove();
  }
}

export function buildOrderReportPdfFileName(report: BulkOrderReport): string {
  return `${report.fileNameBase}.pdf`;
}
