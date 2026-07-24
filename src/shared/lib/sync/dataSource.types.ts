export type EntityDataSource = 'firestore' | 'indexeddb' | 'localStorage';

export interface DataSourceSnapshot {
  customers: EntityDataSource;
  products: EntityDataSource;
  users: EntityDataSource;
  auth: EntityDataSource;
  readFrom: 'indexeddb';
  lastFirestoreSyncAt: string | null;
}

export interface DataStatsSnapshot {
  customerCount: number;
  productCount: number;
  userCount: number;
  sources: DataSourceSnapshot;
}

export const DATA_SOURCE_LABELS: Record<EntityDataSource, string> = {
  firestore: 'Firestore',
  indexeddb: 'IndexedDB',
  localStorage: 'LocalStorage',
};
