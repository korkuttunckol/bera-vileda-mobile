export const APP_CONFIG = {
  name: 'BERA VİLEDA SİPARİŞ SİSTEMİ',
  shortName: 'BERA VİLEDA',
  version: '2.0.0',
  description: 'Saha satış sipariş yönetim sistemi',
  locale: 'tr-TR',
  currency: 'TRY',
} as const;

export const DB_CONFIG = {
  name: 'BeraViledaDB',
  version: 6,
} as const;

export const SYNC_CONFIG = {
  maxRetries: 5,
  retryDelayMs: 3000,
  /** Stuck `processing` lease — reclaim only after this age. */
  processingLeaseMs: 120_000,
  autoSyncIntervalMs: 30_000,
} as const;
