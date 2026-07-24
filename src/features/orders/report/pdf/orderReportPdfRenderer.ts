import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  buildOrderReportTemplateHtml,
  mountOrderReportTemplateHtml,
} from '../orderReportTemplateHtml';
import { buildOrderReportTemplateModel } from '../orderReportTemplateModel';
import { waitForReportDomReady } from '../orderReportAssets';
import {
  assertCanvasHasContent,
  assertPdfBlobHasContent,
} from '../orderReportValidation';
import type { BulkOrderReport } from '../orderReport.types';
import type { OrderReportTemplateModel } from '../orderReportTemplateModel';

async function captureTemplateCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  await waitForReportDomReady(element.parentElement ?? element);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: 794,
    windowWidth: 794,
    scrollX: 0,
    scrollY: 0,
  });

  assertCanvasHasContent(canvas);
  return canvas;
}

function canvasToPdf(canvas: HTMLCanvasElement): Blob {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const imgWidth = printableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
  heightLeft -= printableHeight;

  while (heightLeft > 0) {
    pdf.addPage();
    position = margin - (imgHeight - heightLeft);
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= printableHeight;
  }

  const blob = pdf.output('blob');
  assertPdfBlobHasContent(blob);
  return blob;
}

export async function renderOrderReportPdfFromTemplate(
  model: OrderReportTemplateModel,
): Promise<Blob> {
  const html = buildOrderReportTemplateHtml(model);
  const root = mountOrderReportTemplateHtml(html);

  if (root.textContent?.trim().length === 0) {
    root.parentElement?.remove();
    throw new Error('PDF rapor içeriği boş.');
  }

  try {
    const canvas = await captureTemplateCanvas(root);
    return canvasToPdf(canvas);
  } finally {
    root.parentElement?.remove();
  }
}

export async function renderOrderReportPdf(report: BulkOrderReport): Promise<Blob> {
  const model = buildOrderReportTemplateModel(report);
  return renderOrderReportPdfFromTemplate(model);
}

export function buildOrderReportPdfFileName(report: BulkOrderReport): string {
  return `${report.fileNameBase}.pdf`;
}
