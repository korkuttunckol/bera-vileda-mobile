import type { BulkOrderReport } from '../orderReport.types';
import { buildOrderReportTemplateModel } from '../orderReportTemplateModel';
import {
  renderOrderReportExcelFromTemplate,
  buildOrderReportExcelFileName as buildExcelFileName,
} from './orderReportTemplateExcel';

export async function renderOrderReportExcel(report: BulkOrderReport): Promise<Blob> {
  const model = buildOrderReportTemplateModel(report);
  return renderOrderReportExcelFromTemplate(model);
}

export function buildOrderReportExcelFileName(report: BulkOrderReport): string {
  return buildExcelFileName(report.fileNameBase);
}
