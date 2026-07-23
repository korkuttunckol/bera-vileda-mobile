import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import type { Order, OrderLine } from '@/shared/types/order.types';

export interface OrderExportLine {
  barcode: string;
  productName: string;
  productSku: string;
  quantity: number;
}

export interface OrderExportData {
  order: Order;
  lines: OrderExportLine[];
  createdByName: string;
}

export interface OrderExportFiles {
  pdfBlob: Blob;
  pdfFileName: string;
  excelBlob: Blob;
  excelFileName: string;
}

async function enrichLines(lines: OrderLine[]): Promise<OrderExportLine[]> {
  return Promise.all(
    lines.map(async (line) => {
      const product = await productLocalRepository.getById(line.productId);
      return {
        barcode: product?.barcode ?? '',
        productName: line.productName,
        productSku: line.productSku,
        quantity: line.quantity,
      };
    }),
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('tr-TR');
}

function buildBaseFileName(order: Order): string {
  const code = order.customerCode ?? order.customerId.slice(0, 8);
  const date = new Date(order.orderDate).toISOString().slice(0, 10);
  return `Siparis_${code}_${date}`;
}

export async function buildOrderExportData(
  order: Order,
  lines: OrderLine[],
  createdByName: string,
): Promise<OrderExportData> {
  return {
    order,
    lines: await enrichLines(lines),
    createdByName,
  };
}

export function generateOrderPdf(data: OrderExportData): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  const addPageIfNeeded = (height: number): void => {
    if (y + height > 285) {
      doc.addPage();
      y = 16;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('BERA', margin, y);
  doc.text('Vileda Professional', pageWidth - margin, y, { align: 'right' });
  y += 8;

  doc.setFontSize(16);
  doc.text('TOPLU SIPARIS RAPORU', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Tarih: ${formatDate(data.order.orderDate)}`, margin, y);
  y += 5;
  doc.text(`Siparisi Olusturan: ${data.createdByName}`, margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text(`Cari Kod: ${data.order.customerCode ?? '-'}`, margin, y);
  y += 5;
  doc.text(`Cari Adi: ${data.order.customerName}`, margin, y);
  y += 5;
  doc.text(`Sube: ${data.order.branchName ?? 'Merkez'}`, margin, y);
  y += 6;

  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.text('Barkod', margin, y);
  doc.text('Urun Adi', margin + 32, y);
  doc.text('Urun Kodu', margin + 110, y);
  doc.text('Miktar', pageWidth - margin - 12, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  let totalQty = 0;

  for (const line of data.lines) {
    addPageIfNeeded(8);
    doc.text(line.barcode || '-', margin, y);
    const nameLines = doc.splitTextToSize(line.productName, 70) as string[];
    doc.text(nameLines, margin + 32, y);
    doc.text(line.productSku, margin + 110, y);
    doc.text(String(line.quantity), pageWidth - margin - 12, y);
    totalQty += line.quantity;
    y += Math.max(7, nameLines.length * 4);
  }

  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`Genel Toplam Miktar: ${String(totalQty)}`, margin, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.text('BERA TEMIZLIK', margin, y);
  y += 5;
  doc.text('Korkut TUNCKOL', margin, y);
  y += 5;
  doc.text('0552 580 05 48', margin, y);
  y += 5;
  doc.text('TOKAT', margin, y);

  return doc.output('blob');
}

export function generateOrderExcel(data: OrderExportData): Blob {
  const totalQty = data.lines.reduce((sum, line) => sum + line.quantity, 0);

  const reportRows = [
    ['BERA', 'Vileda Professional'],
    [],
    ['TOPLU SİPARİŞ RAPORU'],
    [`Tarih: ${formatDate(data.order.orderDate)}`],
    [`Siparişi Oluşturan: ${data.createdByName}`],
    [],
    [`Cari Kod: ${data.order.customerCode ?? '-'}`],
    [`Cari Adı: ${data.order.customerName}`],
    [`Şube: ${data.order.branchName ?? 'Merkez'}`],
    [],
    ['Barkod', 'Ürün Adı', 'Ürün Kodu', 'Miktar'],
    ...data.lines.map((line) => [
      line.barcode,
      line.productName,
      line.productSku,
      line.quantity,
    ]),
    [],
    ['Genel Toplam Miktar', totalQty],
    [],
    ['BERA TEMİZLİK'],
    ['Korkut TUNÇKOL'],
    ['0552 580 05 48'],
    ['TOKAT'],
  ];

  const logoRows = [
    ['Cari Kod', 'Şube', 'Barkod', 'Ürün Kodu', 'Miktar'],
    ...data.lines.map((line) => [
      data.order.customerCode ?? '',
      data.order.branchName ?? 'Merkez',
      line.barcode,
      line.productSku,
      line.quantity,
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  const reportSheet = XLSX.utils.aoa_to_sheet(reportRows);
  const logoSheet = XLSX.utils.aoa_to_sheet(logoRows);
  XLSX.utils.book_append_sheet(workbook, reportSheet, 'Siparis Raporu');
  XLSX.utils.book_append_sheet(workbook, logoSheet, 'Logo Aktarim');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function generateOrderExportFiles(
  order: Order,
  lines: OrderLine[],
  createdByName: string,
): Promise<OrderExportFiles> {
  const data = await buildOrderExportData(order, lines, createdByName);
  const baseName = buildBaseFileName(order);

  return {
    pdfBlob: generateOrderPdf(data),
    pdfFileName: `${baseName}.pdf`,
    excelBlob: generateOrderExcel(data),
    excelFileName: `${baseName}.xlsx`,
  };
}

export async function shareOrderExportFiles(
  files: OrderExportFiles,
  options: { pdf: boolean; excel: boolean; whatsapp: boolean },
): Promise<void> {
  const shareFiles: File[] = [];

  if (options.pdf) {
    shareFiles.push(new File([files.pdfBlob], files.pdfFileName, { type: 'application/pdf' }));
  }
  if (options.excel) {
    shareFiles.push(
      new File([files.excelBlob], files.excelFileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
  }

  if (shareFiles.length === 0) {
    return;
  }

  if (options.whatsapp && 'share' in navigator) {
    const shareData = { files: shareFiles };
    if (navigator.canShare(shareData)) {
      await navigator.share({
        title: 'Sipariş Raporu',
        text: 'BERA Vileda sipariş raporu',
        files: shareFiles,
      });
      return;
    }
  }

  for (const file of shareFiles) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (options.whatsapp) {
    const text = encodeURIComponent('BERA Vileda sipariş raporu');
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }
}
