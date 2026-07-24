import { v4 as uuidv4 } from 'uuid';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { importLogRepository } from '@/shared/lib/indexeddb/repositories/importLogRepository';
import {
  parseExcelFile,
  normalizeRow,
  getColumn,
  CUSTOMER_IMPORT_COLUMNS,
  validateCustomerImportHeaders,
} from '@/shared/lib/excel/excelParser';
import { pushImportedCustomersToFirestore } from './importFirestorePushService';
import type { ImportFirestorePushResult } from './importFirestorePushService';
import type { Customer } from '@/shared/types/customer.types';
import type { ImportReport, ImportReportError } from '@/shared/types/import.types';

interface SavedCustomerImportRow {
  row: number;
  customer: Customer;
}

function isEmptyDataRow(row: Record<string, string>): boolean {
  const code = getColumn(row, [...CUSTOMER_IMPORT_COLUMNS.code]);
  const name = getColumn(row, [...CUSTOMER_IMPORT_COLUMNS.name]);
  const city = getColumn(row, [...CUSTOMER_IMPORT_COLUMNS.city]);
  return !code && !name && !city;
}

async function applyCustomerFirestoreSyncResults(
  savedRows: SavedCustomerImportRow[],
  firestoreResult: ImportFirestorePushResult,
): Promise<void> {
  const failedIds = new Set(
    firestoreResult.failed.map((failure) => failure.entityId),
  );
  const now = new Date().toISOString();

  for (const { customer } of savedRows) {
    let syncStatus: Customer['syncStatus'] = 'synced';

    if (firestoreResult.skipped > 0) {
      syncStatus = 'pending';
    } else if (failedIds.has(customer.id)) {
      syncStatus = 'failed';
    }

    await customerLocalRepository.save({
      ...customer,
      syncStatus,
      updatedAt: now,
    });
  }
}

class CustomerImportService {
  async importFromFile(
    file: File,
    userId: string,
  ): Promise<ImportReport> {
    const startedAt = new Date().toISOString();
    const reportId = uuidv4();
    const errors: ImportReport['errors'] = [];
    const savedRows: SavedCustomerImportRow[] = [];
    let created = 0;
    let updated = 0;
    let failed = 0;

    const rows = await parseExcelFile(file);

    const headerCheck = validateCustomerImportHeaders(rows);
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

      const code = getColumn(row, [...CUSTOMER_IMPORT_COLUMNS.code]);
      const name = getColumn(row, [...CUSTOMER_IMPORT_COLUMNS.name]);
      const city = getColumn(row, [...CUSTOMER_IMPORT_COLUMNS.city]);

      if (!code) {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          name: name || undefined,
          message: 'Cari Kodu boş olduğu için kayıt atlandı.',
        });
        continue;
      }
      if (!name) {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          code,
          message: 'Cari Adı boş olduğu için kayıt atlandı.',
        });
        continue;
      }
      if (!city) {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          code,
          name,
          message: 'Şehir bilgisi boş olduğu için kayıt içe aktarılamadı.',
        });
        continue;
      }

      try {
        const normalizedCode = code.toUpperCase();
        const existing =
          await customerLocalRepository.findByCodeExact(normalizedCode);
        const now = new Date().toISOString();

        let customer: Customer;

        if (existing) {
          customer = {
            ...existing,
            code: normalizedCode,
            name,
            address: {
              ...existing.address,
              city,
            },
            isDeleted: false,
            source: 'excel',
            updatedAt: now,
            updatedBy: userId,
            version: existing.version + 1,
            syncStatus: 'pending',
          };
          await customerLocalRepository.save(customer);
          updated++;
        } else {
          customer = {
            id: uuidv4(),
            localId: uuidv4(),
            salesRepId: userId,
            code: normalizedCode,
            name,
            address: { city },
            isActive: true,
            isDeleted: false,
            source: 'excel',
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
            version: 1,
            syncStatus: 'pending',
          };
          await customerLocalRepository.save(customer);
          created++;
        }

        savedRows.push({ row: rowNum, customer });
      } catch (err) {
        failed++;
        errors.push({
          row: rowNum,
          category: 'failed',
          code,
          name,
          message: err instanceof Error ? err.message : 'Kayıt hatası',
        });
      }
    }

    const firestoreErrors: ImportReportError[] = [];
    const firestoreResult = await pushImportedCustomersToFirestore(
      savedRows.map((entry) => entry.customer),
    );

    for (const failure of firestoreResult.failed) {
      const saved = savedRows.find((entry) => entry.customer.id === failure.entityId);
      firestoreErrors.push({
        row: saved?.row ?? 0,
        category: 'failed',
        code: saved?.customer.code,
        name: saved?.customer.name,
        message: `Firestore yazımı başarısız: ${failure.message}`,
      });
    }

    if (firestoreResult.skipped > 0) {
      console.warn(
        `[Import] ${String(firestoreResult.skipped)} cari kaydı Firestore'a yazılamadı (çevrimdışı veya yapılandırma yok).`,
      );
    }

    await applyCustomerFirestoreSyncResults(savedRows, firestoreResult);

    const completedAt = new Date().toISOString();
    const report: ImportReport = {
      id: reportId,
      type: 'customers',
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

export const customerImportService = new CustomerImportService();
