import type { Order } from '@/shared/types/order.types';
import type { OrderLine } from '@/shared/types/order.types';
import { buildBulkOrderReportFromOrder } from './orderReportBuilder';
import {
  buildOrderReportExcelFileName,
  renderOrderReportExcel,
} from './excel/orderReportExcelRenderer';
import {
  buildOrderReportPdfFileName,
  renderOrderReportPdf,
} from './pdf/orderReportPdfRenderer';
import { shareGeneratedFiles } from './orderReportShareService';
import type {
  BulkOrderReport,
  OrderReportFiles,
  OrderReportShareKind,
} from './orderReport.types';

export async function buildOrderReportFiles(
  report: BulkOrderReport,
): Promise<OrderReportFiles> {
  const [pdfBlob, excelBlob] = await Promise.all([
    renderOrderReportPdf(report),
    Promise.resolve(renderOrderReportExcel(report)),
  ]);

  return {
    pdfBlob,
    pdfFileName: buildOrderReportPdfFileName(report),
    excelBlob,
    excelFileName: buildOrderReportExcelFileName(report),
  };
}

export async function generateOrderReportFiles(
  order: Order,
  lines: OrderLine[],
  createdByName: string,
): Promise<OrderReportFiles> {
  const report = await buildBulkOrderReportFromOrder(order, lines, createdByName);
  return buildOrderReportFiles(report);
}

export async function shareOrderReport(
  order: Order,
  lines: OrderLine[],
  createdByName: string,
  kind: OrderReportShareKind,
): Promise<void> {
  const report = await buildBulkOrderReportFromOrder(order, lines, createdByName);

  if (kind === 'pdf') {
    const pdfBlob = await renderOrderReportPdf(report);
    await shareGeneratedFiles([
      new File([pdfBlob], buildOrderReportPdfFileName(report), {
        type: 'application/pdf',
      }),
    ], { whatsapp: false });
    return;
  }

  if (kind === 'excel') {
    const excelBlob = renderOrderReportExcel(report);
    await shareGeneratedFiles([
      new File([excelBlob], buildOrderReportExcelFileName(report), {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    ], { whatsapp: false });
    return;
  }

  const files = await buildOrderReportFiles(report);
  await shareGeneratedFiles(
    [
      new File([files.pdfBlob], files.pdfFileName, { type: 'application/pdf' }),
      new File([files.excelBlob], files.excelFileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    ],
    { whatsapp: true },
  );
}

export async function shareOrderExportFiles(
  order: Order,
  lines: OrderLine[],
  createdByName: string,
  options: { pdf: boolean; excel: boolean; whatsapp: boolean },
): Promise<void> {
  const report = await buildBulkOrderReportFromOrder(order, lines, createdByName);
  const files: File[] = [];

  if (options.pdf) {
    const pdfBlob = await renderOrderReportPdf(report);
    files.push(
      new File([pdfBlob], buildOrderReportPdfFileName(report), {
        type: 'application/pdf',
      }),
    );
  }

  if (options.excel) {
    const excelBlob = renderOrderReportExcel(report);
    files.push(
      new File([excelBlob], buildOrderReportExcelFileName(report), {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
  }

  if (files.length === 0) {
    return;
  }

  await shareGeneratedFiles(files, { whatsapp: options.whatsapp });
}
