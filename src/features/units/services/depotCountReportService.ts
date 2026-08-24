import { jsPDF } from 'jspdf';
import { shareGeneratedFiles } from '@/features/orders/report/orderReportShareService';
import type { Product } from '@/shared/types/product.types';

export type DepotCountWarehouse = 'central' | 'returns';
export type DepotCountReportKind = 'excel' | 'pdf';

interface DepotCountReportInput {
  warehouse: DepotCountWarehouse;
  groupCode: string;
  products: Product[];
  counts: Partial<Record<string, number>>;
  createdByName: string;
}

interface DepotCountReportLine {
  barcode: string;
  sku: string;
  name: string;
  stock: number;
  count: number;
  difference: number;
}

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function warehouseLabel(warehouse: DepotCountWarehouse): string {
  return warehouse === 'central' ? 'Merkez Depo' : 'İade Deposu';
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
}

function buildLines(input: DepotCountReportInput): DepotCountReportLine[] {
  return [...input.products]
    .sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'))
    .map((product) => {
      const stock = product.stockQuantity || 0;
      const count = input.counts[product.id] ?? 0;
      return {
        barcode: product.barcode?.trim() || '-',
        sku: product.sku || '-',
        name: product.name,
        stock,
        count,
        difference: count - stock,
      };
    });
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function fileNameBase(input: DepotCountReportInput): string {
  const depot = input.warehouse === 'central' ? 'merkez-depo' : 'iade-deposu';
  const group = input.groupCode.replace(/[^a-z0-9_-]+/gi, '-').toLocaleLowerCase('tr-TR');
  return `bera-sayim-${depot}-${group || 'grup'}-${dateStamp()}`;
}

async function buildExcel(input: DepotCountReportInput): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BERA Yönetim Sistemi';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Depo Sayımı', { views: [{ showGridLines: false }] });
  const lines = buildLines(input);
  const warehouse = warehouseLabel(input.warehouse);

  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = 'BERA DEPO SAYIM RAPORU';
  sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF173B67' } };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  sheet.mergeCells('A2:G2');
  sheet.getCell('A2').value = `${warehouse} · Grup Kodu: ${input.groupCode} · ${new Date().toLocaleString('tr-TR')}`;
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  sheet.mergeCells('A3:G3');
  sheet.getCell('A3').value = `Sayan: ${input.createdByName}`;
  sheet.getCell('A3').alignment = { horizontal: 'center' };
  sheet.addRow([]);

  const header = sheet.addRow(['Barkod', 'Stok Kodu', 'Stok Açıklaması', 'Depo', 'Depo Stok', 'Sayım Miktarı', 'Fark']);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173B67' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  lines.forEach((line) => {
    const row = sheet.addRow([line.barcode, line.sku, line.name, warehouse, line.stock, line.count, line.difference]);
    row.getCell(7).font = { bold: true, color: { argb: line.difference === 0 ? 'FF15803D' : 'FFB91C1C' } };
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } } };
    });
  });
  const total = sheet.addRow(['', '', 'TOPLAM', '',
    { formula: `SUM(E6:E${String(sheet.rowCount)})` },
    { formula: `SUM(F6:F${String(sheet.rowCount)})` },
    { formula: `SUM(G6:G${String(sheet.rowCount)})` },
  ]);
  total.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF173B67' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF6' } };
  });
  sheet.columns = [
    { width: 20 }, { width: 16 }, { width: 48 }, { width: 18 }, { width: 14 }, { width: 15 }, { width: 12 },
  ];
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.views = [{ state: 'frozen', ySplit: 5 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: EXCEL_MIME });
}

function buildPdf(input: DepotCountReportInput): Blob {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const lines = buildLines(input);
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const left = 10;
  const columns = [34, 28, 105, 28, 22, 24, 20];
  const headers = ['Barkod', 'Kod', 'Stok Açıklaması', 'Depo', 'Depo Stok', 'Sayım', 'Fark'];
  const warehouse = warehouseLabel(input.warehouse);
  let y = 12;

  const tableHeader = (): void => {
    pdf.setFillColor(23, 59, 103);
    pdf.rect(left, y - 5, width - left * 2, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    let x = left + 1;
    headers.forEach((header, index) => { pdf.text(header, x, y); x += columns[index]; });
    y += 6;
    pdf.setTextColor(25, 35, 50);
  };
  const header = (): void => {
    pdf.setTextColor(23, 59, 103);
    pdf.setFontSize(15);
    pdf.text('BERA DEPO SAYIM RAPORU', left, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setTextColor(60, 70, 85);
    pdf.text(`${warehouse}  |  Grup Kodu: ${input.groupCode}  |  ${new Date().toLocaleString('tr-TR')}`, left, y);
    y += 5;
    pdf.text(`Sayan: ${input.createdByName}`, left, y);
    y += 8;
    tableHeader();
  };
  header();
  pdf.setFontSize(7.5);

  lines.forEach((line) => {
    const splitName: unknown = pdf.splitTextToSize(line.name, columns[2] - 3);
    const name = Array.isArray(splitName)
      ? splitName.map((value) => String(value))
      : [String(splitName)];
    const rowHeight = Math.max(6, name.length * 4);
    if (y + rowHeight > height - 12) {
      pdf.addPage();
      y = 12;
      tableHeader();
    }
    let x = left + 1;
    const values = [line.barcode, line.sku, name, warehouse, formatNumber(line.stock), formatNumber(line.count), formatNumber(line.difference)];
    values.forEach((value, index) => {
      if (index === 6) pdf.setTextColor(line.difference === 0 ? 21 : 185, line.difference === 0 ? 128 : 28, line.difference === 0 ? 61 : 28);
      pdf.text(value, x, y);
      pdf.setTextColor(25, 35, 50);
      x += columns[index];
    });
    pdf.setDrawColor(220, 225, 230);
    pdf.line(left, y + rowHeight - 2, width - left, y + rowHeight - 2);
    y += rowHeight;
  });
  return pdf.output('blob');
}

export async function exportDepotCountReport(
  input: DepotCountReportInput,
  kind: DepotCountReportKind,
): Promise<void> {
  const base = fileNameBase(input);
  if (kind === 'excel') {
    const blob = await buildExcel(input);
    await shareGeneratedFiles([new File([blob], `${base}.xlsx`, { type: EXCEL_MIME })], { whatsapp: false });
    return;
  }
  const blob = buildPdf(input);
  await shareGeneratedFiles([new File([blob], `${base}.pdf`, { type: 'application/pdf' })], { whatsapp: false });
}
