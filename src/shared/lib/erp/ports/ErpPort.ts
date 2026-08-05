export interface ErpExportResult {
  success: boolean;
  erpReferenceId?: string;
  errorMessage?: string;
  /**
   * true ise sipariş Firestore'a gitti; Logo GO Wings aktarımı
   * kullanıcı tarafından manuel dosya ile tamamlanacak.
   */
  deferred?: boolean;
}

export interface ErpImportResult {
  success: boolean;
  importedCount: number;
  errorMessage?: string;
}

export interface ErpOrderPayload {
  orderId: string;
  customerCode: string;
  lines: {
    productSku: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface ErpPort {
  exportOrder(payload: ErpOrderPayload): Promise<ErpExportResult>;
  importProducts(): Promise<ErpImportResult>;
  importCustomers(): Promise<ErpImportResult>;
  updateStockLevels(): Promise<ErpImportResult>;
}
