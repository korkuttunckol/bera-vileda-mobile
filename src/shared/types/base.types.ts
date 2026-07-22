export type SyncStatus = 'synced' | 'pending' | 'failed' | 'conflict';

export interface BaseEntity {
  id: string;
  localId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  version: number;
  syncStatus: SyncStatus;
  deletedAt?: string;
}

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}
