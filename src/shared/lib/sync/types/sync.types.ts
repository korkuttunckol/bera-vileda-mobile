export type SyncTrigger = 'manual' | 'auto' | 'online_reconnect';

export interface SyncReportError {
  entityType: string;
  entityId: string;
  idempotencyKey: string;
  message: string;
  timestamp: string;
}

export interface SyncPushStats {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
  pending: number;
}

import type { SyncPullValidation } from '../syncPullValidation';

export interface SyncPullStats {
  customers: number;
  products: number;
  users: number;
  validation?: SyncPullValidation;
  full: boolean;
  /** Full replace skipped because Firestore master data was empty while local had rows. */
  skippedEmptyRemote?: boolean;
}

export interface SyncNowOptions {
  full?: boolean;
  forceFull?: boolean;
}

export interface SyncOrderStats {
  sent: number;
  pending: number;
  failed: number;
  sending: number;
}

export interface SyncReport {
  id: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  trigger: SyncTrigger;
  push: SyncPushStats;
  pull: SyncPullStats;
  orders?: SyncOrderStats;
  errors: SyncReportError[];
  success: boolean;
}

export interface SyncResult {
  success: boolean;
  report: SyncReport;
}

export interface SyncQueuePayload {
  entityType: 'order' | 'customer' | 'branch' | 'product';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
}
