import type {
  ErpExportResult,
  ErpImportResult,
  ErpOrderPayload,
  ErpPort,
} from '../ports/ErpPort';

/**
 * Logo GO Wings dosya tabanlı ERP adapter (v2).
 *
 * REST/SOAP API henüz bağlanmamıştır. Sipariş aktarımı kullanıcı tetiklemeli
 * Logo Aktarım Excel dosyası ile yapılır (`logoWingsExportService`).
 * Sync motoru bu adapter üzerinden siparişi "manuel aktarım bekliyor" olarak işaretler.
 */
export class LogoWingsFileAdapter implements ErpPort {
  exportOrder(payload: ErpOrderPayload): Promise<ErpExportResult> {
    return Promise.resolve({
      success: true,
      deferred: true,
      erpReferenceId: `LOGO-MANUAL-${payload.orderId.slice(0, 8).toUpperCase()}`,
    });
  }

  importProducts(): Promise<ErpImportResult> {
    return Promise.resolve({
      success: false,
      importedCount: 0,
      errorMessage:
        'Ürün içe aktarma Ayarlar → Ürün İçe Aktar ekranından Logo Wings Excel ile yapılır.',
    });
  }

  importCustomers(): Promise<ErpImportResult> {
    return Promise.resolve({
      success: false,
      importedCount: 0,
      errorMessage:
        'Cari içe aktarma Ayarlar → Cari İçe Aktar ekranından Logo Wings Excel ile yapılır.',
    });
  }

  updateStockLevels(): Promise<ErpImportResult> {
    return Promise.resolve({
      success: false,
      importedCount: 0,
      errorMessage:
        'Stok güncelleme Ayarlar → Depo Stok Güncelleme ekranından Logo Wings Excel ile yapılır.',
    });
  }
}
