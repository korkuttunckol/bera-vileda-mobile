import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  buildOrderReportCustomerHtml,
  buildOrderReportFooterHtml,
  buildOrderReportHeaderHtml,
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

const REPORT_WIDTH_PX = 794;
const BLOCK_GAP_MM = 2;
const FOOTER_RESERVE_MM = 8;

interface PdfLayoutState {
  y: number;
  margin: number;
  printableWidth: number;
  printableHeight: number;
  pageBottom: number;
}

async function captureTemplateCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  await waitForReportDomReady(element.parentElement ?? element);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: REPORT_WIDTH_PX,
    windowWidth: REPORT_WIDTH_PX,
    scrollX: 0,
    scrollY: 0,
  });

  assertCanvasHasContent(canvas);
  return canvas;
}

function canvasHeightToMm(canvas: HTMLCanvasElement, imgWidthMm: number): number {
  return (canvas.height * imgWidthMm) / canvas.width;
}

function addPageNumbers(pdf: jsPDF, margin: number): void {
  const totalPages = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${String(page)} / ${String(totalPages)}`, pageWidth / 2, pageHeight - margin / 2, {
      align: 'center',
    });
  }
}

function addCanvasBlockToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  layout: PdfLayoutState,
): void {
  const imgWidth = layout.printableWidth;
  const imgHeight = canvasHeightToMm(canvas, imgWidth);
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const availableHeight = layout.pageBottom - layout.y;

  if (imgHeight > availableHeight && layout.y > layout.margin) {
    pdf.addPage();
    layout.y = layout.margin;
  }

  if (imgHeight > layout.printableHeight - FOOTER_RESERVE_MM) {
    let remainingHeight = imgHeight;
    let sourceY = 0;

    while (remainingHeight > 0) {
      const sliceHeightMm = Math.min(
        layout.printableHeight - FOOTER_RESERVE_MM,
        remainingHeight,
      );
      const sliceHeightPx = (sliceHeightMm / imgWidth) * canvas.width;
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('PDF dilimleme başarısız oldu.');
      }

      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx,
      );

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
      const currentAvailable = layout.pageBottom - layout.y;

      if (sliceHeightMm > currentAvailable && layout.y > layout.margin) {
        pdf.addPage();
        layout.y = layout.margin;
      }

      pdf.addImage(sliceData, 'JPEG', layout.margin, layout.y, imgWidth, sliceHeightMm);
      layout.y += sliceHeightMm + BLOCK_GAP_MM;
      sourceY += sliceHeightPx;
      remainingHeight -= sliceHeightMm;

      if (remainingHeight > 0) {
        pdf.addPage();
        layout.y = layout.margin;
      }
    }

    return;
  }

  pdf.addImage(imgData, 'JPEG', layout.margin, layout.y, imgWidth, imgHeight);
  layout.y += imgHeight + BLOCK_GAP_MM;
}

async function renderHtmlBlockToPdf(
  pdf: jsPDF,
  html: string,
  layout: PdfLayoutState,
): Promise<void> {
  const root = mountOrderReportTemplateHtml(html);

  try {
    const canvas = await captureTemplateCanvas(root);
    addCanvasBlockToPdf(pdf, canvas, layout);
  } finally {
    root.parentElement?.remove();
  }
}

async function composePdfFromTemplate(model: OrderReportTemplateModel): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  const layout: PdfLayoutState = {
    y: margin,
    margin,
    printableWidth,
    printableHeight,
    pageBottom: margin + printableHeight - FOOTER_RESERVE_MM,
  };

  await renderHtmlBlockToPdf(pdf, buildOrderReportHeaderHtml(model), layout);

  for (const [index, customer] of model.customers.entries()) {
    const isLast = index === model.customers.length - 1;
    await renderHtmlBlockToPdf(
      pdf,
      buildOrderReportCustomerHtml(customer, isLast),
      layout,
    );
  }

  await renderHtmlBlockToPdf(pdf, buildOrderReportFooterHtml(model), layout);
  addPageNumbers(pdf, margin);

  const blob = pdf.output('blob');
  assertPdfBlobHasContent(blob);
  return blob;
}

export async function renderOrderReportPdfFromTemplate(
  model: OrderReportTemplateModel,
): Promise<Blob> {
  if (model.customers.length === 0) {
    throw new Error('PDF rapor içeriği boş.');
  }

  return composePdfFromTemplate(model);
}

export async function renderOrderReportPdf(report: BulkOrderReport): Promise<Blob> {
  const model = buildOrderReportTemplateModel(report);
  return renderOrderReportPdfFromTemplate(model);
}

export function buildOrderReportPdfFileName(report: BulkOrderReport): string {
  return `${report.fileNameBase}.pdf`;
}
