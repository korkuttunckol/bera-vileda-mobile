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

export interface SyncOrderPullStats {
  /** Remote orders successfully written (insert + update). */
  pulled: number;
  /** Existing local rows updated by id. */
  updated: number;
  /** Local pending/sending/failed rows left untouched. */
  skipped: number;
}

export interface SyncPullStats {
  customers: number;
  products: number;
  users: number;
  /** Customer branch docs pulled into IndexedDB `branches`. */
  branches?: number;
  /** Present only when Admin order pull ran. */
  orders?: SyncOrderPullStats;
  validation?: SyncPullValidation;
  full: boolean;
  /** Full replace skipped because Firestore master data was empty while local had rows. */
  skippedEmptyRemote?: boolean;
}

export interface SyncNowOptions {
  full?: boolean;
  forceFull?: boolean;
  /**
   * Master-data download only (customers/products/users).
   * Skips user push, outbox/order push, and any upload paths.
   */
  pullOnly?: boolean;
  /**
   * Admin-only: also pull Firestore orders (+ lines) into IndexedDB.
   * Ignored when pullOnly is true.
   */
  includeOrders?: boolean;
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
