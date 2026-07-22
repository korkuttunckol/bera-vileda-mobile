export interface ErpExportResult {
  success: boolean;
  erpReferenceId?: string;
  errorMessage?: string;
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
