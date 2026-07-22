import type {
  ErpExportResult,
  ErpImportResult,
  ErpOrderPayload,
  ErpPort,
} from '../ports/ErpPort';
import { isFirebaseConfigured } from '@/config/env';

/**
 * V1 stub adapter — Logo Wings entegrasyonu Faz 7+'da eklenecek.
 * REST veya SOAP fark etmeksizin ErpPort arayüzü üzerinden çalışır.
 */
export class NullErpAdapter implements ErpPort {
  exportOrder(payload: ErpOrderPayload): Promise<ErpExportResult> {
    if (!isFirebaseConfigured()) {
      return Promise.resolve({
        success: true,
        erpReferenceId: `WINGS-DEV-${payload.orderId.slice(0, 8).toUpperCase()}`,
      });
    }

    return Promise.resolve({
      success: false,
      errorMessage: 'Logo Wings entegrasyonu henüz aktif değil.',
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

export const erpAdapter: ErpPort = new NullErpAdapter();
