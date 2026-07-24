import type { BulkOrderReport } from './orderReport.types';

export class OrderReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderReportValidationError';
  }
}

export function validateBulkOrderReport(report: BulkOrderReport): void {
  if (!report.createdByName.trim()) {
    throw new OrderReportValidationError('Siparişi oluşturan kullanıcı bilgisi eksik.');
  }

  if (report.customers.length === 0) {
    throw new OrderReportValidationError('Rapor için müşteri verisi bulunamadı.');
  }

  for (const customer of report.customers) {
    if (!customer.customerName.trim()) {
      throw new OrderReportValidationError('Müşteri adı rapora aktarılamadı.');
    }
    if (!customer.branchName.trim()) {
      throw new OrderReportValidationError('Şube bilgisi rapora aktarılamadı.');
    }
    if (customer.lines.length === 0) {
      throw new OrderReportValidationError('Ürün satırları rapora aktarılamadı.');
    }
  }

  const customersWithLines = report.customers.filter((customer) => customer.lines.length > 0);
  if (customersWithLines.length === 0) {
    throw new OrderReportValidationError('Rapor için ürün satırı bulunamadı.');
  }

  if (report.grandTotalQuantity <= 0) {
    throw new OrderReportValidationError('Rapor toplam adet sıfır olamaz.');
  }
}

import type { OrderReportTemplateModel } from './orderReportTemplateModel';

export function validateOrderReportTemplateModel(
  model: OrderReportTemplateModel,
): void {
  if (model.customers.length === 0) {
    throw new OrderReportValidationError('Rapor şablonunda müşteri bulunamadı.');
  }

  let totalRows = 0;
  for (const customer of model.customers) {
    if (customer.tableRows.length === 0) {
      throw new OrderReportValidationError('Rapor şablonunda ürün satırı bulunamadı.');
    }
    totalRows += customer.tableRows.length;
  }

  if (totalRows === 0) {
    throw new OrderReportValidationError('Rapor şablonuna ürün aktarılamadı.');
  }

  if (model.grandTotalValue <= 0) {
    throw new OrderReportValidationError('Genel toplam adet rapora aktarılamadı.');
  }
}

export function assertCanvasHasContent(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new OrderReportValidationError('PDF görüntüsü oluşturulamadı.');
  }

  const sampleHeight = Math.min(canvas.height, 240);
  const pixels = context.getImageData(0, 0, canvas.width, sampleHeight).data;
  let contentPixels = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 255;
    const green = pixels[index + 1] ?? 255;
    const blue = pixels[index + 2] ?? 255;
    const alpha = pixels[index + 3] ?? 0;
    if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
      contentPixels += 1;
    }
  }

  if (contentPixels < 20) {
    throw new OrderReportValidationError('PDF raporu boş oluşturuldu.');
  }
}

export function assertPdfBlobHasContent(blob: Blob): void {
  if (blob.size < 1024) {
    throw new OrderReportValidationError('PDF raporu boş oluşturuldu.');
  }
}

export function assertExcelBlobHasContent(blob: Blob): void {
  if (blob.size < 1024) {
    throw new OrderReportValidationError('Excel raporu boş oluşturuldu.');
  }
}
