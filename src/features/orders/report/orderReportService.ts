import type { Order } from '@/shared/types/order.types';
import type { OrderLine } from '@/shared/types/order.types';
import { orderService } from '@/features/orders/services/orderService';
import { buildBulkOrderReportFromOrder, buildBulkOrderReportFromOrders } from './orderReportBuilder';
import { buildOrderReportTemplateModel } from './orderReportTemplateModel';
import {
  renderOrderReportExcelFromTemplate,
  buildOrderReportExcelFileName,
} from './excel/orderReportTemplateExcel';
import {
  renderOrderReportPdfFromTemplate,
  buildOrderReportPdfFileName,
} from './pdf/orderReportPdfRenderer';
import { shareGeneratedFiles } from './orderReportShareService';
import {
  assertExcelBlobHasContent,
  validateBulkOrderReport,
  validateOrderReportTemplateModel,
} from './orderReportValidation';
import type {
  BulkOrderReport,
  OrderReportFiles,
  OrderReportShareKind,
} from './orderReport.types';

function prepareTemplate(report: BulkOrderReport) {
  validateBulkOrderReport(report);
  const model = buildOrderReportTemplateModel(report);
  validateOrderReportTemplateModel(model);
  return model;
}

export async function buildOrderReportFiles(
  report: BulkOrderReport,
): Promise<OrderReportFiles> {
  const model = prepareTemplate(report);
  const [pdfBlob, excelBlob] = await Promise.all([
    renderOrderReportPdfFromTemplate(model),
    renderOrderReportExcelFromTemplate(model),
  ]);

  assertExcelBlobHasContent(excelBlob);

  return {
    pdfBlob,
    pdfFileName: buildOrderReportPdfFileName(report),
    excelBlob,
    excelFileName: buildOrderReportExcelFileName(report.fileNameBase),
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
  const model = prepareTemplate(report);

  if (kind === 'pdf') {
    const pdfBlob = await renderOrderReportPdfFromTemplate(model);
    await shareGeneratedFiles([
      new File([pdfBlob], buildOrderReportPdfFileName(report), {
        type: 'application/pdf',
      }),
    ], { whatsapp: false });
    return;
  }

  if (kind === 'excel') {
    const excelBlob = await renderOrderReportExcelFromTemplate(model);
    assertExcelBlobHasContent(excelBlob);
    await shareGeneratedFiles([
      new File([excelBlob], buildOrderReportExcelFileName(report.fileNameBase), {
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
  const model = prepareTemplate(report);
  const files: File[] = [];

  if (options.pdf) {
    const pdfBlob = await renderOrderReportPdfFromTemplate(model);
    files.push(
      new File([pdfBlob], buildOrderReportPdfFileName(report), {
        type: 'application/pdf',
      }),
    );
  }

  if (options.excel) {
    const excelBlob = await renderOrderReportExcelFromTemplate(model);
    assertExcelBlobHasContent(excelBlob);
    files.push(
      new File([excelBlob], buildOrderReportExcelFileName(report.fileNameBase), {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
  }

  if (files.length === 0) {
    return;
  }

  await shareGeneratedFiles(files, { whatsapp: options.whatsapp });
}

async function loadOrderEntries(
  orders: Order[],
): Promise<Array<{ order: Order; lines: OrderLine[] }>> {
  return Promise.all(
    orders.map(async (order) => ({
      order,
      lines: await orderService.getLines(order.id),
    })),
  );
}

export async function shareBulkOrderReport(
  orders: Order[],
  createdByName: string,
  kind: OrderReportShareKind,
): Promise<void> {
  if (orders.length === 0) {
    throw new Error('En az bir sipariş seçilmelidir.');
  }

  const entries = await loadOrderEntries(orders);
  const report = await buildBulkOrderReportFromOrders(entries, createdByName);
  const model = prepareTemplate(report);

  if (kind === 'pdf') {
    const pdfBlob = await renderOrderReportPdfFromTemplate(model);
    await shareGeneratedFiles([
      new File([pdfBlob], buildOrderReportPdfFileName(report), {
        type: 'application/pdf',
      }),
    ], { whatsapp: false });
    return;
  }

  if (kind === 'excel') {
    const excelBlob = await renderOrderReportExcelFromTemplate(model);
    assertExcelBlobHasContent(excelBlob);
    await shareGeneratedFiles([
      new File([excelBlob], buildOrderReportExcelFileName(report.fileNameBase), {
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
