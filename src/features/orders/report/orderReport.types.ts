export interface OrderReportLine {
  barcode: string;
  productName: string;
  productSku: string;
  quantity: number;
}

export interface OrderReportCustomerBlock {
  customerCode: string;
  customerName: string;
  branchName: string;
  lineCount: number;
  lines: OrderReportLine[];
  totalQuantity: number;
}

export interface BulkOrderReport {
  reportDate: string;
  createdByName: string;
  customers: OrderReportCustomerBlock[];
  grandTotalQuantity: number;
  fileNameBase: string;
}

export interface OrderReportFiles {
  pdfBlob: Blob;
  pdfFileName: string;
  excelBlob: Blob;
  excelFileName: string;
}

export type OrderReportShareKind = 'pdf' | 'excel' | 'whatsapp';
