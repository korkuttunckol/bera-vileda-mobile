export const ORDER_REPORT_FOOTER = {
  company: 'BERA TEMİZLİK',
  contactName: 'Korkut TUNÇKOL',
  phone: '0552 580 05 48',
  city: 'TOKAT',
} as const;

export const ORDER_REPORT_LABELS = {
  title: 'TOPLU SİPARİŞ RAPORU',
  date: 'Tarih',
  createdBy: 'Siparişi Oluşturan',
  customerCode: 'Cari Kod',
  customerName: 'Cari Adı',
  branch: 'Şube',
  grandTotal: 'GENEL TOPLAM MİKTAR',
  columns: {
    barcode: 'Barkod',
    productName: 'Ürün Adı',
    productSku: 'Ürün Kodu',
    quantity: 'Miktar',
  },
  logoSheetName: 'Logo Aktarım',
  reportSheetName: 'Sipariş Raporu',
  logoColumns: ['Cari Kod', 'Şube', 'Barkod', 'Ürün Kodu', 'Miktar'] as const,
} as const;

export const ORDER_REPORT_LOGO_PATHS = {
  bera: '/assets/logos/bera-logo.svg',
  vileda: '/assets/logos/vileda-professional-logo.svg',
} as const;

export const ORDER_REPORT_SHARE_TEXT = 'BERA Vileda sipariş raporu';
