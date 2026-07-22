export type CustomerDisplayField =
  | 'code'
  | 'name'
  | 'phone'
  | 'contactPerson'
  | 'email'
  | 'city'
  | 'district'
  | 'fullAddress'
  | 'taxNumber'
  | 'status';

export type ProductDisplayField =
  | 'sku'
  | 'name'
  | 'barcode'
  | 'stock'
  | 'price'
  | 'vatRate'
  | 'category'
  | 'unit';

export interface DisplayPreferences {
  customerFields: CustomerDisplayField[];
  productFields: ProductDisplayField[];
}

export const CUSTOMER_FIELD_LABELS: Record<CustomerDisplayField, string> = {
  code: 'Cari Kodu',
  name: 'Müşteri Adı',
  phone: 'Telefon',
  contactPerson: 'Yetkili Kişi',
  email: 'E-posta',
  city: 'İl',
  district: 'İlçe',
  fullAddress: 'Adres',
  taxNumber: 'Vergi No',
  status: 'Durum (Aktif/Pasif)',
};

export const PRODUCT_FIELD_LABELS: Record<ProductDisplayField, string> = {
  sku: 'Ürün Kodu',
  name: 'Ürün Adı',
  barcode: 'Barkod',
  stock: 'Depo Stok',
  price: 'Liste Fiyatı',
  vatRate: 'KDV (%)',
  category: 'Kategori',
  unit: 'Birim',
};

export const DEFAULT_CUSTOMER_DISPLAY_FIELDS: CustomerDisplayField[] = [
  'name',
  'code',
  'phone',
  'status',
];

export const DEFAULT_PRODUCT_DISPLAY_FIELDS: ProductDisplayField[] = [
  'name',
  'sku',
  'stock',
  'barcode',
];

export const ALL_CUSTOMER_DISPLAY_FIELDS = Object.keys(
  CUSTOMER_FIELD_LABELS,
) as CustomerDisplayField[];

export const ALL_PRODUCT_DISPLAY_FIELDS = Object.keys(
  PRODUCT_FIELD_LABELS,
) as ProductDisplayField[];
