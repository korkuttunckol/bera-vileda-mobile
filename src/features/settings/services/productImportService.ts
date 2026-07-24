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
import { pushImportedProductsToFirestore } from './importFirestorePushService';
import type { ImportFirestorePushResult } from './importFirestorePushService';
import type { Product } from '@/shared/types/product.types';
import type { ImportReport, ImportReportError } from '@/shared/types/import.types';

interface SavedProductImportRow {
  row: number;
  product: Product;
}

function isEmptyDataRow(row: Record<string, string>): boolean {
  const producerCode = getColumn(row, [...PRODUCT_IMPORT_COLUMNS.producerCode]);
  const barcode = getColumn(row, [...PRODUCT_IMPORT_COLUMNS.barcode]);
  const name = getColumn(row, [...PRODUCT_IMPORT_COLUMNS.name]);
  return !producerCode && !barcode && !name;
}

async function applyProductFirestoreSyncResults(
  savedRows: SavedProductImportRow[],
  firestoreResult: ImportFirestorePushResult,
): Promise<void> {
  const failedIds = new Set(
    firestoreResult.failed.map((failure) => failure.entityId),
  );
  const now = new Date().toISOString();

  for (const { product } of savedRows) {
    let syncStatus: Product['syncStatus'] = 'synced';

    if (firestoreResult.skipped > 0) {
      syncStatus = 'pending';
    } else if (failedIds.has(product.id)) {
      syncStatus = 'failed';
    }

    await productLocalRepository.save({
      ...product,
      syncStatus,
      updatedAt: now,
    });
  }
}

class ProductImportService {
  async importFromFile(
    file: File,
    userId: string,
  ): Promise<ImportReport> {
    const startedAt = new Date().toISOString();
    const reportId = uuidv4();
    const errors: ImportReport['errors'] = [];
    const savedRows: SavedProductImportRow[] = [];
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

        let product: Product;

        if (existing) {
          product = {
            ...existing,
            sku: normalizedSku,
            name,
            barcode,
            isDeleted: false,
            updatedAt: now,
            updatedBy: userId,
            version: existing.version + 1,
            syncStatus: 'pending',
          };
          await productLocalRepository.save(product);
          updated++;
        } else {
          product = {
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
            syncStatus: 'pending',
          };
          await productLocalRepository.save(product);
          created++;
        }

        savedRows.push({ row: rowNum, product });
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

    const firestoreErrors: ImportReportError[] = [];
    const firestoreResult = await pushImportedProductsToFirestore(
      savedRows.map((entry) => entry.product),
    );

    for (const failure of firestoreResult.failed) {
      const saved = savedRows.find((entry) => entry.product.id === failure.entityId);
      firestoreErrors.push({
        row: saved?.row ?? 0,
        category: 'failed',
        code: saved?.product.sku,
        name: saved?.product.name,
        barcode: saved?.product.barcode,
        message: `Firestore yazımı başarısız: ${failure.message}`,
      });
    }

    if (firestoreResult.skipped > 0) {
      console.warn(
        `[Import] ${String(firestoreResult.skipped)} ürün kaydı Firestore'a yazılamadı (çevrimdışı veya yapılandırma yok).`,
      );
    }

    await applyProductFirestoreSyncResults(savedRows, firestoreResult);

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
      errors: [...errors, ...firestoreErrors],
      success: failed === 0 && firestoreResult.failed.length === 0,
      firestore: {
        attempted: firestoreResult.attempted,
        synced: firestoreResult.synced,
        failed: firestoreResult.failed.length,
        skipped: firestoreResult.skipped,
      },
    };

    await importLogRepository.save(report);
    return report;
  }
}

export const productImportService = new ProductImportService();
