import type {
  ErpExportResult,
  ErpImportResult,
  ErpOrderPayload,
  ErpPort,
} from '../ports/ErpPort';

/**
 * Geliştirme / no-op stub. Üretimde `LogoWingsFileAdapter` kullanılır
 * (`src/shared/lib/erp/index.ts`).
 */
export class NullErpAdapter implements ErpPort {
  exportOrder(payload: ErpOrderPayload): Promise<ErpExportResult> {
    return Promise.resolve({
      success: true,
      deferred: true,
      erpReferenceId: `WINGS-DEV-${payload.orderId.slice(0, 8).toUpperCase()}`,
    });
  }

  importProducts(): Promise<ErpImportResult> {
    return Promise.resolve({
      success: false,
      importedCount: 0,
      errorMessage: 'ERP entegrasyonu henüz aktif değil.',
    });
  }

  importCustomers(): Promise<ErpImportResult> {
    return Promise.resolve({
      success: false,
      importedCount: 0,
      errorMessage: 'ERP entegrasyonu henüz aktif değil.',
    });
  }

  updateStockLevels(): Promise<ErpImportResult> {
    return Promise.resolve({
      success: false,
      importedCount: 0,
      errorMessage: 'ERP entegrasyonu henüz aktif değil.',
    });
  }
}
