import { ORDER_REPORT_LABELS } from '../orderReport.constants';
import { ORDER_REPORT_LAYOUT, ORDER_REPORT_TABLE_COLUMNS } from '../orderReportLayout';
import { loadOrderReportLogoAssets } from '../orderReportAssets';
import type { OrderReportTemplateModel } from '../orderReportTemplateModel';
import type ExcelJS from 'exceljs';

const { colors, excel, fonts } = ORDER_REPORT_LAYOUT;

const LOGO_HEIGHT = 34;
const LOGO_BERA_WIDTH = 130;
const LOGO_VILEDA_WIDTH = 150;

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin', color: { argb: colors.borderArgb } },
    left: { style: 'thin', color: { argb: colors.borderArgb } },
    bottom: { style: 'thin', color: { argb: colors.borderArgb } },
    right: { style: 'thin', color: { argb: colors.borderArgb } },
  };
}

function dashedBorderBottom(): Partial<ExcelJS.Borders> {
  return {
    bottom: { style: 'mediumDashed', color: { argb: colors.separatorArgb } },
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

function styleMetaLabelCell(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, size: 9, color: { argb: colors.navyArgb } };
  cell.fill = fillSolid(colors.customerLabelBgArgb);
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  cell.border = thinBorder();
}

function styleMetaValueCell(cell: ExcelJS.Cell): void {
  cell.font = { size: 9, color: { argb: 'FF111827' } };
  cell.fill = fillSolid(colors.whiteArgb);
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = thinBorder();
}

function renderCustomerMetaBlock(
  sheet: ExcelJS.Worksheet,
  customer: OrderReportTemplateModel['customers'][number],
): number {
  const fields = [
    {
      label: ORDER_REPORT_LABELS.sequenceNumber,
      value: String(customer.sequenceNumber),
    },
    {
      label: ORDER_REPORT_LABELS.customerCode,
      value: customer.customerCode,
    },
    {
      label: ORDER_REPORT_LABELS.customerName,
      value: customer.customerName,
    },
    {
      label: ORDER_REPORT_LABELS.branch,
      value: customer.branchName,
    },
  ];

  const startRow = sheet.rowCount + 1;

  fields.forEach((field) => {
    const row = sheet.addRow([field.label, field.value, '', '']);
    row.height = 22;
    styleMetaLabelCell(row.getCell(1));
    styleMetaValueCell(row.getCell(2));
    sheet.mergeCells(row.number, 2, row.number, 3);
    styleMetaValueCell(row.getCell(2));
    row.getCell(4).border = thinBorder();
    row.getCell(4).fill = fillSolid(colors.customerTotalBoxBgArgb);
  });

  const endRow = sheet.rowCount;
  sheet.mergeCells(startRow, 4, endRow, 4);

  const totalCell = sheet.getCell(startRow, 4);
  totalCell.value = {
    richText: [
      {
        font: { bold: true, size: 10, color: { argb: colors.navyArgb } },
        text: `${ORDER_REPORT_LABELS.totalQuantity}\n`,
      },
      {
        font: { bold: true, size: 24, color: { argb: colors.navyArgb } },
        text: String(customer.totalQuantity),
      },
    ],
  };
  totalCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  totalCell.fill = fillSolid(colors.customerTotalBoxBgArgb);
  totalCell.border = thinBorder();

  return endRow;
}

function renderCustomerSeparator(sheet: ExcelJS.Worksheet): void {
  sheet.addRow(['']);
  const row = sheet.getRow(sheet.rowCount);
  row.height = 12;
  sheet.mergeCells(row.number, 1, row.number, excel.totalColumns);
  row.getCell(1).border = dashedBorderBottom();
}

async function renderReportSheetFromTemplate(
  workbook: ExcelJS.Workbook,
  model: OrderReportTemplateModel,
): Promise<ExcelJS.Worksheet> {
  const assets = await loadOrderReportLogoAssets();
  const sheet = workbook.addWorksheet(ORDER_REPORT_LABELS.reportSheetName, {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: excel.printMarginInches,
      printTitlesRow: `1:${String(excel.headerRepeatRows)}`,
    },
  });

  sheet.columns = ORDER_REPORT_TABLE_COLUMNS.map((column) => ({
    width: column.excelWidth,
  }));

  sheet.getRow(1).height = LOGO_HEIGHT + 6;
  const beraImage = workbook.addImage({
    base64: assets.beraPngBase64,
    extension: 'png',
  });
  const viledaImage = workbook.addImage({
    base64: assets.viledaPngBase64,
    extension: 'png',
  });
  sheet.addImage(beraImage, {
    tl: { col: 0.05, row: 0.02 },
    ext: { width: LOGO_BERA_WIDTH, height: LOGO_HEIGHT },
  });
  sheet.addImage(viledaImage, {
    tl: { col: 2.55, row: 0.02 },
    ext: { width: LOGO_VILEDA_WIDTH, height: LOGO_HEIGHT },
  });

  const titleRow = sheet.getRow(1);
  sheet.mergeCells(1, 2, 1, 3);
  const titleCell = titleRow.getCell(2);
  titleCell.value = model.title;
  titleCell.font = { bold: true, size: fonts.titlePt, color: { argb: colors.navyArgb } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const redLineRow = sheet.addRow(['']);
  redLineRow.height = 6;
  sheet.mergeCells(redLineRow.number, 1, redLineRow.number, excel.totalColumns);
  redLineRow.getCell(1).fill = fillSolid(colors.redArgb);

  const dateRow = sheet.addRow([model.dateText]);
  sheet.mergeCells(dateRow.number, 1, dateRow.number, excel.totalColumns);
  dateRow.getCell(1).font = { size: 10 };
  dateRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

  const creatorRow = sheet.addRow([model.createdByText]);
  sheet.mergeCells(creatorRow.number, 1, creatorRow.number, excel.totalColumns);
  creatorRow.getCell(1).font = { size: 10 };
  creatorRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

  sheet.addRow([]);
  sheet.getRow(sheet.rowCount).height = 8;

  model.customers.forEach((customer, customerIndex) => {
    if (customerIndex > 0) {
      renderCustomerSeparator(sheet);
    }

    renderCustomerMetaBlock(sheet, customer);

    sheet.addRow([]);
    sheet.getRow(sheet.rowCount).height = 6;

    const tableHeaderRow = sheet.addRow([...model.tableHeaders]);
    styleTableHeaderRow(tableHeaderRow);

    customer.tableRows.forEach((line) => {
      const dataRow = sheet.addRow([
        line.barcode,
        line.productSku,
        line.productName,
        line.quantity,
      ]);
      styleTableBodyRow(dataRow);
    });
  });

  sheet.addRow([]);
  sheet.getRow(sheet.rowCount).height = 12;

  const totalRow = sheet.addRow([
    `${model.grandTotalLabel}: ${String(model.grandTotalValue)}`,
  ]);
  sheet.mergeCells(totalRow.number, 1, totalRow.number, excel.totalColumns);
  totalRow.height = 32;
  const totalCell = totalRow.getCell(1);
  totalCell.font = { bold: true, size: fonts.grandTotalPt, color: { argb: colors.navyArgb } };
  totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
  totalCell.fill = fillSolid(colors.customerTotalBoxBgArgb);
  totalCell.border = {
    top: { style: 'medium', color: { argb: colors.navyArgb } },
    left: { style: 'medium', color: { argb: colors.navyArgb } },
    bottom: { style: 'medium', color: { argb: colors.navyArgb } },
    right: { style: 'medium', color: { argb: colors.navyArgb } },
  };

  sheet.addRow([]);
  sheet.getRow(sheet.rowCount).height = 10;

  model.footerLines.forEach((line) => {
    const row = sheet.addRow([line]);
    sheet.mergeCells(row.number, 1, row.number, excel.totalColumns);
    row.height = 18;
    const cell = row.getCell(1);
    cell.font = { size: fonts.footerPt, color: { argb: colors.navyArgb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  sheet.pageSetup.printArea = `A1:D${String(sheet.rowCount)}`;
  sheet.headerFooter = {
    oddFooter: '&C&"Arial"&9BERA Vileda Sipariş Raporu - Sayfa &P / &N',
    evenFooter: '&C&"Arial"&9BERA Vileda Sipariş Raporu - Sayfa &P / &N',
  };

  return sheet;
}

function buildLogoTransferSheet(
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
    });
  });

  return sheet;
}

export async function renderOrderReportExcelFromTemplate(
  model: OrderReportTemplateModel,
): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BERA Vileda Sipariş Sistemi';
  workbook.created = new Date();

  await renderReportSheetFromTemplate(workbook, model);
  buildLogoTransferSheet(workbook, model);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function buildOrderReportExcelFileName(fileNameBase: string): string {
  return `${fileNameBase}.xlsx`;
}
