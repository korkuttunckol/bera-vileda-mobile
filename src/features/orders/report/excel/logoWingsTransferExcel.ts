import { ORDER_REPORT_LABELS } from '../orderReport.constants';
import { ORDER_REPORT_LAYOUT } from '../orderReportLayout';
import type { OrderReportTemplateModel } from '../orderReportTemplateModel';
import type ExcelJS from 'exceljs';

const { colors } = ORDER_REPORT_LAYOUT;

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin', color: { argb: colors.borderArgb } },
    left: { style: 'thin', color: { argb: colors.borderArgb } },
    bottom: { style: 'thin', color: { argb: colors.borderArgb } },
    right: { style: 'thin', color: { argb: colors.borderArgb } },
  };
}

function fillSolid(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function styleTableHeaderRow(row: ExcelJS.Row): void {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: colors.whiteArgb }, size: 10 };
    cell.fill = fillSolid(colors.tableHeaderBgArgb);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
  });
}

function styleTableBodyRow(row: ExcelJS.Row): void {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { size: 9, color: { argb: 'FF111827' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
    cell.fill = fillSolid(colors.whiteArgb);
  });
}

/**
 * Logo GO Wings aktarım şablonu — tek sayfa:
 * Cari Kod | Şube | Barkod | Ürün Kodu | Miktar
 */
export function buildLogoWingsTransferSheet(
  workbook: ExcelJS.Workbook,
  model: OrderReportTemplateModel,
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(ORDER_REPORT_LABELS.logoSheetName, {
    views: [{ showGridLines: true }],
  });

  sheet.columns = [
    { width: 14 },
    { width: 24 },
    { width: 18 },
    { width: 16 },
    { width: 10 },
  ];

  const headerRow = sheet.addRow([...ORDER_REPORT_LABELS.logoColumns]);
  styleTableHeaderRow(headerRow);

  let rowCount = 0;
  model.customers.forEach((customer) => {
    customer.tableRows.forEach((line) => {
      const row = sheet.addRow([
        customer.customerCode === '-' ? '' : customer.customerCode,
        customer.branchName,
        line.barcode === '-' ? '' : line.barcode,
        line.productSku,
        line.quantity,
      ]);
      styleTableBodyRow(row);
      rowCount += 1;
    });
  });

  if (rowCount === 0) {
    throw new Error('Logo GO Wings aktarımı için en az bir ürün satırı gerekir.');
  }

  return sheet;
}

export async function renderLogoWingsTransferExcel(
  model: OrderReportTemplateModel,
): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BERA Vileda Sipariş Sistemi';
  workbook.created = new Date();

  buildLogoWingsTransferSheet(workbook, model);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function buildLogoWingsTransferFileName(fileNameBase: string): string {
  return `Logo_GO_Wings_${fileNameBase}.xlsx`;
}
