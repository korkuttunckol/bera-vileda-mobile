import { v4 as uuidv4 } from 'uuid';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import type { LocalProduct } from '@/shared/lib/indexeddb/db';
import { importLogRepository } from '@/shared/lib/indexeddb/repositories/importLogRepository';
import {
  parseExcelFile,
  normalizeRow,
  getColumn,
  parseNumber,
  STOCK_IMPORT_COLUMNS,
  PRODUCT_IMPORT_COLUMNS,
  validateStockImportHeaders,
} from '@/shared/lib/excel/excelParser';
import type { ImportReport, ImportReportError } from '@/shared/types/import.types';

type StockMatchField = 'producercode' | 'barcode';

interface StockMatchResult {
  product: LocalProduct | undefined;
  matchedBy: StockMatchField | null;
}

function isEmptyStockRow(row: Record<string, string>): boolean {
  const producerCode = getColumn(row, [...STOCK_IMPORT_COLUMNS.producerCode]);
  const stockStr = getColumn(row, [...STOCK_IMPORT_COLUMNS.stockQuantity]);
  return !producerCode && stockStr === '';
}

function readOptionalStockRowFields(row: Record<string, string>) {
  return {
    barcode: getColumn(row, [...PRODUCT_IMPORT_COLUMNS.barcode]) || undefined,
    name: getColumn(row, [...PRODUCT_IMPORT_COLUMNS.name]) || undefined,
  };
}

async function findProductForStockUpdate(
  producerCode: string,
  barcode: string | undefined,
): Promise<StockMatchResult> {
  const normalizedSku = producerCode.toUpperCase();
  const bySku = await productLocalRepository.findBySku(normalizedSku);
  if (bySku && !bySku.isDeleted) {
    return { product: bySku, matchedBy: 'producercode' };
  }

  const trimmedBarcode = barcode?.trim();
  if (trimmedBarcode) {
    const byBarcode = await productLocalRepository.findByBarcode(trimmedBarcode);
    if (byBarcode && !byBarcode.isDeleted) {
      return { product: byBarcode, matchedBy: 'barcode' };
    }
  }

  return { product: undefined, matchedBy: null };
}

function buildNotFoundStockError(
  rowNum: number,
  producerCode: string,
  barcode: string | undefined,
  name: string | undefined,
): ImportReportError {
  const trimmedBarcode = barcode?.trim();
  const matchAttempts = ['PRODUCERCODE: eşleşmedi'];
  const suggestions = ['Ürün kodu uyuşmuyor.'];

  if (trimmedBarcode) {
    matchAttempts.push('CODE (Barkod): eşleşmedi');
    suggestions.push('Barkod uyuşmuyor.');
  } else {
    matchAttempts.push('CODE (Barkod): denenmedi (Excel\'de boş)');
  }

  suggestions.push('Ürün sisteme aktarılmamış olabilir.');
  suggestions.push('Excel dosyasındaki ürün bilgilerini kontrol edin.');

  return {
    row: rowNum,
    category: 'not_found',
    code: producerCode,
    barcode: trimmedBarcode || undefined,
    name,
    matchInfo: matchAttempts.join(' · '),
    message:
      'Ürün kartlarında PRODUCERCODE ve CODE (Barkod) ile eşleşen kayıt bulunamadığı için stok güncellenemedi.',
    suggestion: suggestions.join(' '),
  };
}

class StockUpdateService {
  async updateFromFile(file: File, userId: string): Promise<ImportReport> {
    const startedAt = new Date().toISOString();
    const reportId = uuidv4();
    const errors: ImportReport['errors'] = [];
    let updated = 0;
    let notFound = 0;
    let failed = 0;

    const rows = await parseExcelFile(file);

    const headerCheck = validateStockImportHeaders(rows);
    if (!headerCheck.ok) {
      throw new Error(
        `Excel dosyasında zorunlu sütunlar eksik: ${headerCheck.missing.join(', ')}`,
      );
    }

    let totalRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const row = normalizeRow(rows[i]);

      if (isEmptyStockRow(row)) continue;

      totalRows++;

      const producerCode = getColumn(row, [...STOCK_IMPORT_COLUMNS.producerCode]);
      const stockStr = getColumn(row, [...STOCK_IMPORT_COLUMNS.stockQuantity]);
      const { barcode, name } = readOptionalStockRowFields(row);

      if (!producerCode) {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          name,
          barcode,
          message: 'PRODUCERCODE boş olduğu için satır atlandı.',
          suggestion: 'Excel dosyasındaki ürün bilgilerini kontrol edin.',
        });
        continue;
      }

      if (stockStr === '') {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          code: producerCode,
          name,
          barcode,
          message: 'MERKEZ stok miktarı boş olduğu için satır atlandı.',
          suggestion: 'Stok miktarı sütununu kontrol edin.',
        });
        continue;
      }

      try {
        const { product } = await findProductForStockUpdate(producerCode, barcode);

        if (!product) {
          notFound++;
          errors.push(buildNotFoundStockError(rowNum, producerCode, barcode, name));
          continue;
        }

        const stockQuantity = parseNumber(stockStr);
        await productLocalRepository.save({
          ...product,
          stockQuantity,
          updatedAt: new Date().toISOString(),
          updatedBy: userId,
          version: product.version + 1,
        });
        updated++;
      } catch (err) {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          code: producerCode,
          name,
          barcode,
          message: err instanceof Error ? err.message : 'Güncelleme hatası',
          suggestion: 'Excel dosyasındaki ürün bilgilerini kontrol edin.',
        });
      }
    }

    const completedAt = new Date().toISOString();
    const report: ImportReport = {
      id: reportId,
      type: 'stock',
      fileName: file.name,
      startedAt,
      completedAt,
      durationMs:
        new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      totalRows,
      created: 0,
      updated,
      failed,
      notFound,
      errors,
      success: failed === 0 && notFound === 0,
    };

    await importLogRepository.save(report);
    return report;
  }
}

export const stockUpdateService = new StockUpdateService();
