export const APP_CONFIG = {
  name: 'BERA VİLEDA SİPARİŞ SİSTEMİ',
  shortName: 'BERA VİLEDA',
  version: '1.0.0-test001',
  description: 'Saha satış sipariş yönetim sistemi',
  locale: 'tr-TR',
  currency: 'TRY',
} as const;

export const DB_CONFIG = {
  name: 'BeraViledaDB',
  version: 5,
} as const;

export const SYNC_CONFIG = {
  maxRetries: 5,
  retryDelayMs: 3000,
  autoSyncIntervalMs: 30_000,
} as const;
