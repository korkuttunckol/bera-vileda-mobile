import { v4 as uuidv4 } from 'uuid';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import { importLogRepository } from '@/shared/lib/indexeddb/repositories/importLogRepository';
import {
  parseExcelFile,
  normalizeRow,
  getColumn,
  PRODUCT_IMPORT_COLUMNS,
  validateProductImportHeaders,
} from '@/shared/lib/excel/excelParser';
import type { Product } from '@/shared/types/product.types';
import type { ImportReport } from '@/shared/types/import.types';

function isEmptyDataRow(row: Record<string, string>): boolean {
  const producerCode = getColumn(row, [...PRODUCT_IMPORT_COLUMNS.producerCode]);
  const barcode = getColumn(row, [...PRODUCT_IMPORT_COLUMNS.barcode]);
  const name = getColumn(row, [...PRODUCT_IMPORT_COLUMNS.name]);
  return !producerCode && !barcode && !name;
}

class ProductImportService {
  async importFromFile(
    file: File,
    userId: string,
  ): Promise<ImportReport> {
    const startedAt = new Date().toISOString();
    const reportId = uuidv4();
    const errors: ImportReport['errors'] = [];
    let created = 0;
    let updated = 0;
    let failed = 0;

    const rows = await parseExcelFile(file);

    const headerCheck = validateProductImportHeaders(rows);
    if (!headerCheck.ok) {
      throw new Error(
        `Excel dosyasında zorunlu sütunlar eksik: ${headerCheck.missing.join(', ')}`,
      );
    }

    let totalRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const row = normalizeRow(rows[i]);

      if (isEmptyDataRow(row)) continue;

      totalRows++;

      const producerCode = getColumn(row, [...PRODUCT_IMPORT_COLUMNS.producerCode]);
      const barcode = getColumn(row, [...PRODUCT_IMPORT_COLUMNS.barcode]);
      const name = getColumn(row, [...PRODUCT_IMPORT_COLUMNS.name]);

      if (!producerCode) {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          name: name || undefined,
          barcode: barcode || undefined,
          message: 'Ürün Kodu (PRODUCERCODE) boş olduğu için kayıt atlandı.',
        });
        continue;
      }
      if (!barcode) {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          code: producerCode,
          name: name || undefined,
          message: 'Barkod (CODE) boş olduğu için kayıt atlandı.',
        });
        continue;
      }
      if (!name) {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          code: producerCode,
          barcode,
          message: 'Ürün Adı (NAME) boş olduğu için kayıt atlandı.',
        });
        continue;
      }

      try {
        const normalizedSku = producerCode.toUpperCase();
        const existing = await productLocalRepository.findBySku(normalizedSku);
        const now = new Date().toISOString();

        if (existing) {
          await productLocalRepository.save({
            ...existing,
            sku: normalizedSku,
            name,
            barcode,
            isDeleted: false,
            updatedAt: now,
            updatedBy: userId,
            version: existing.version + 1,
            syncStatus: 'synced',
          });
          updated++;
        } else {
          const product: Product = {
            id: uuidv4(),
            localId: uuidv4(),
            sku: normalizedSku,
            name,
            barcode,
            category: 'Genel',
            unit: 'Adet',
            listPrice: 0,
            vatRate: 20,
            stockQuantity: 0,
            isActive: true,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
            version: 1,
            syncStatus: 'synced',
          };
          await productLocalRepository.save(product);
          created++;
        }
      } catch (err) {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          code: producerCode,
          name,
          barcode,
          message: err instanceof Error ? err.message : 'Kayıt hatası',
        });
      }
    }

    const completedAt = new Date().toISOString();
    const report: ImportReport = {
      id: reportId,
      type: 'products',
      fileName: file.name,
      startedAt,
      completedAt,
      durationMs:
        new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      totalRows,
      created,
      updated,
      failed,
      notFound: 0,
      errors,
      success: failed === 0,
    };

    await importLogRepository.save(report);
    return report;
  }
}

export const productImportService = new ProductImportService();
