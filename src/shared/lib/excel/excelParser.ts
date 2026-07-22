import * as XLSX from 'xlsx';

export function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Dosya okunamadı'));
          return;
        }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('Excel dosyasında sayfa bulunamadı'));
          return;
        }
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
        });
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Excel parse hatası'));
      }
    };
    reader.onerror = () => { reject(new Error('Dosya okuma hatası')); };
    reader.readAsArrayBuffer(file);
  });
}

/** Satır hücre değerini güvenli string'e çevirir */
function cellToString(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

/** Excel başlık anahtarını normalize eder (Logo Wings: Cari Kodu, Cari Adı, Şehir) */
export function normalizeHeaderKey(key: string): string {
  return key
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/** Satır başlıklarını normalize eder (küçük harf, boşluksuz) */
export function normalizeRow(
  row: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    result[normalizeHeaderKey(key)] = cellToString(value);
  }
  return result;
}

export function getColumn(
  row: Record<string, string>,
  aliases: string[],
): string {
  for (const alias of aliases) {
    const val = row[alias];
    if (val) return val;
  }
  return '';
}

export function parseNumber(value: string, fallback = 0): number {
  if (!value) return fallback;
  const cleaned = value.replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? fallback : num;
}

export const PRODUCT_COLUMNS = {
  sku: ['urunkodu', 'stokkodu', 'sku', 'kod', 'stok_kodu'],
  name: ['urunadi', 'stokadi', 'ad', 'name', 'unvan', 'urun_adi'],
  barcode: ['barkod', 'barcode', 'barkodno'],
  unit: ['birim', 'unit', 'olcubirimi'],
  listPrice: ['fiyat', 'listefiyat', 'listprice', 'birimfiyat', 'satisfiyati'],
  vatRate: ['kdv', 'vatrate', 'kdvorani', 'kdv_oran'],
  category: ['kategori', 'category', 'grup'],
  stockQuantity: ['depostok', 'stok', 'stokmiktari', 'stockquantity', 'miktar'],
} as const;

/** V0.3 ürün içe aktarma — yalnızca Logo Wings zorunlu kolonları */
export const PRODUCT_IMPORT_COLUMNS = {
  /** PRODUCERCODE → product.sku (Ürün Kodu) */
  producerCode: ['producercode'],
  /** CODE → product.barcode (Barkod) */
  barcode: ['code'],
  /** NAME → product.name (Ürün Adı) */
  name: ['name'],
} as const;

export const PRODUCT_IMPORT_REQUIRED_HEADERS = [
  { label: 'PRODUCERCODE', aliases: PRODUCT_IMPORT_COLUMNS.producerCode },
  { label: 'CODE', aliases: PRODUCT_IMPORT_COLUMNS.barcode },
  { label: 'NAME', aliases: PRODUCT_IMPORT_COLUMNS.name },
] as const;

export function validateProductImportHeaders(
  rows: Record<string, unknown>[],
): { ok: true } | { ok: false; missing: string[] } {
  if (rows.length === 0) {
    return { ok: false, missing: PRODUCT_IMPORT_REQUIRED_HEADERS.map((h) => h.label) };
  }

  const headers = getSheetHeaderKeys(rows[0]);
  const missing = PRODUCT_IMPORT_REQUIRED_HEADERS.filter(
    (col) => !col.aliases.some((alias) => headers.has(alias)),
  ).map((col) => col.label);

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return { ok: true };
}

/** V0.3 müşteri içe aktarma — yalnızca Logo Wings zorunlu kolonları */
export const CUSTOMER_IMPORT_COLUMNS = {
  code: ['carikodu', 'carikod', 'kod', 'code', 'musterikodu'],
  name: ['cariadi', 'unvan', 'cariad', 'ad', 'name', 'musteriadi', 'firma'],
  city: ['sehir', 'il', 'city'],
} as const;

export const CUSTOMER_IMPORT_REQUIRED_HEADERS = [
  { label: 'Cari Kodu', aliases: CUSTOMER_IMPORT_COLUMNS.code },
  { label: 'Cari Adı', aliases: CUSTOMER_IMPORT_COLUMNS.name },
  { label: 'Şehir', aliases: CUSTOMER_IMPORT_COLUMNS.city },
] as const;

export function getSheetHeaderKeys(firstRow: Record<string, unknown>): Set<string> {
  return new Set(Object.keys(firstRow).map(normalizeHeaderKey));
}

export function validateCustomerImportHeaders(
  rows: Record<string, unknown>[],
): { ok: true } | { ok: false; missing: string[] } {
  if (rows.length === 0) {
    return { ok: false, missing: CUSTOMER_IMPORT_REQUIRED_HEADERS.map((h) => h.label) };
  }

  const headers = getSheetHeaderKeys(rows[0]);
  const missing = CUSTOMER_IMPORT_REQUIRED_HEADERS.filter(
    (col) => !col.aliases.some((alias) => headers.has(alias)),
  ).map((col) => col.label);

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return { ok: true };
}

export const CUSTOMER_COLUMNS = {
  code: ['carikodu', 'carikod', 'kod', 'code', 'musterikodu'],
  name: ['unvan', 'cariadi', 'ad', 'name', 'musteriadi', 'firma'],
  taxNumber: ['vergino', 'vergi_no', 'taxnumber', 'vkn'],
  phone: ['telefon', 'phone', 'tel', 'gsm'],
  contactPerson: ['yetkili', 'contactperson', 'ilgili'],
  email: ['eposta', 'email', 'e-posta', 'mail'],
  city: ['il', 'city', 'sehir'],
  district: ['ilce', 'district'],
  fullAddress: ['adres', 'address', 'acikadres', 'fulladdress'],
} as const;

export const STOCK_COLUMNS = {
  sku: ['urunkodu', 'stokkodu', 'sku', 'kod', 'stok_kodu'],
  stockQuantity: ['depostok', 'stok', 'stokmiktari', 'stockquantity', 'miktar'],
} as const;

/** Depo stok güncelleme — Logo Wings başlıkları (sütun sırasından bağımsız) */
export const STOCK_IMPORT_COLUMNS = {
  /** PRODUCERCODE → ürün eşleştirme (product.sku) */
  producerCode: ['producercode', ...PRODUCT_IMPORT_COLUMNS.producerCode],
  /** MERKEZ → depo stok miktarı */
  stockQuantity: ['merkez'],
} as const;

export const STOCK_IMPORT_REQUIRED_HEADERS = [
  { label: 'PRODUCERCODE', aliases: STOCK_IMPORT_COLUMNS.producerCode },
  { label: 'MERKEZ', aliases: STOCK_IMPORT_COLUMNS.stockQuantity },
] as const;

export function validateStockImportHeaders(
  rows: Record<string, unknown>[],
): { ok: true } | { ok: false; missing: string[] } {
  if (rows.length === 0) {
    return { ok: false, missing: STOCK_IMPORT_REQUIRED_HEADERS.map((h) => h.label) };
  }

  const headers = getSheetHeaderKeys(rows[0]);
  const missing = STOCK_IMPORT_REQUIRED_HEADERS.filter(
    (col) => !col.aliases.some((alias) => headers.has(alias)),
  ).map((col) => col.label);

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return { ok: true };
}
