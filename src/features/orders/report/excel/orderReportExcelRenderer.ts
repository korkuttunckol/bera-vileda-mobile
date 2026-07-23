import * as XLSX from 'xlsx';
import {
  ORDER_REPORT_FOOTER,
  ORDER_REPORT_LABELS,
} from '../orderReport.constants';
import { formatOrderReportDateTime } from '../orderReportFormat';
import type { BulkOrderReport } from '../orderReport.types';

function buildReportSheetRows(report: BulkOrderReport): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [
    ['BERA', 'Vileda Professional'],
    [],
    [ORDER_REPORT_LABELS.title],
    [`${ORDER_REPORT_LABELS.date}: ${formatOrderReportDateTime(report.reportDate)}`],
    [`${ORDER_REPORT_LABELS.createdBy}: ${report.createdByName}`],
    [],
  ];

  report.customers.forEach((customer, index) => {
    rows.push(
      [`${ORDER_REPORT_LABELS.customerCode}: ${customer.customerCode}`],
      [`${ORDER_REPORT_LABELS.customerName}: ${customer.customerName}`],
      [`${ORDER_REPORT_LABELS.branch}: ${customer.branchName}`],
      [],
      [
        ORDER_REPORT_LABELS.columns.barcode,
        ORDER_REPORT_LABELS.columns.productName,
        ORDER_REPORT_LABELS.columns.productSku,
        ORDER_REPORT_LABELS.columns.quantity,
      ],
      ...customer.lines.map((line) => [
        line.barcode,
        line.productName,
        line.productSku,
        line.quantity,
      ]),
    );

    if (index < report.customers.length - 1) {
      rows.push([], ['—'], []);
    }
  });

  rows.push(
    [],
    [ORDER_REPORT_LABELS.grandTotal, report.grandTotalQuantity],
    [],
    [ORDER_REPORT_FOOTER.company],
    [ORDER_REPORT_FOOTER.contactName],
    [ORDER_REPORT_FOOTER.phone],
    [ORDER_REPORT_FOOTER.city],
  );

  return rows;
}

function buildLogoTransferRows(report: BulkOrderReport): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [
    [...ORDER_REPORT_LABELS.logoColumns],
  ];

  for (const customer of report.customers) {
    for (const line of customer.lines) {
      rows.push([
        customer.customerCode === '-' ? '' : customer.customerCode,
        customer.branchName,
        line.barcode,
        line.productSku,
        line.quantity,
      ]);
    }
  }

  return rows;
}

function applyReportSheetLayout(sheet: XLSX.WorkSheet): void {
  sheet['!cols'] = [
    { wch: 18 },
    { wch: 42 },
    { wch: 18 },
    { wch: 10 },
  ];
}

function applyLogoSheetLayout(sheet: XLSX.WorkSheet): void {
  sheet['!cols'] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 10 },
  ];
}

export function renderOrderReportExcel(report: BulkOrderReport): Blob {
  const workbook = XLSX.utils.book_new();

  const reportSheet = XLSX.utils.aoa_to_sheet(buildReportSheetRows(report));
  applyReportSheetLayout(reportSheet);
  XLSX.utils.book_append_sheet(workbook, reportSheet, ORDER_REPORT_LABELS.reportSheetName);

  const logoSheet = XLSX.utils.aoa_to_sheet(buildLogoTransferRows(report));
  applyLogoSheetLayout(logoSheet);
  XLSX.utils.book_append_sheet(workbook, logoSheet, ORDER_REPORT_LABELS.logoSheetName);

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function buildOrderReportExcelFileName(report: BulkOrderReport): string {
  return `${report.fileNameBase}.xlsx`;
}
