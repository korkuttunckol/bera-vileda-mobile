export type ImportType = 'products' | 'customers' | 'stock';

export type ImportReportErrorCategory = 'failed' | 'not_found';

export interface ImportReportError {
  row: number;
  message: string;
  category?: ImportReportErrorCategory;
  /** Geriye dönük uyumluluk için */
  identifier?: string;
  code?: string;
  name?: string;
  barcode?: string;
  /** Hangi alan ile eşleşti / eşleşme denemesi (stok güncelleme) */
  matchInfo?: string;
  /** Kullanıcıya yönelik öneri */
  suggestion?: string;
}

export interface ImportReportFirestoreSummary {
  attempted: number;
  synced: number;
  failed: number;
  skipped: number;
}

export interface ImportReport {
  id: string;
  type: ImportType;
  fileName: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  notFound: number;
  errors: ImportReportError[];
  success: boolean;
  firestore?: ImportReportFirestoreSummary;
}

export const IMPORT_TYPE_LABELS: Record<ImportType, string> = {
  products: 'Ürün Kartları',
  customers: 'Cari Kartları',
  stock: 'Depo Stok',
};
