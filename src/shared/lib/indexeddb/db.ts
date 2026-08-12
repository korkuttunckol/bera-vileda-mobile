import Dexie, { type EntityTable } from 'dexie';
import { DB_CONFIG } from '@/config/app.config';
import type { Order, OrderLine } from '@/shared/types/order.types';
import type { Customer, CustomerBranch } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';
import type { SyncReport } from '@/shared/lib/sync/types/sync.types';
import type { ImportReport } from '@/shared/types/import.types';
import type { AppUser } from '@/shared/types/user.types';

export interface LocalMeta {
  key: string;
  value: string;
}

export interface LocalSyncQueueItem {
  id: string;
  entityType: 'order' | 'customer' | 'branch' | 'product';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  idempotencyKey: string;
  payload: string;
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  status: 'pending' | 'processing' | 'failed';
}

export type LocalOrder = Order;
export type LocalOrderLine = OrderLine;
export type LocalCustomer = Customer;
export type LocalBranch = CustomerBranch;
export type LocalProduct = Product;
export type LocalSyncReport = SyncReport;
export type LocalImportReport = ImportReport;
export type LocalUser = AppUser;

export const META_KEYS = {
  LAST_PULL_CUSTOMERS: 'lastPullSyncAt:customers',
  LAST_PULL_PRODUCTS: 'lastPullSyncAt:products',
  LAST_PULL_BRANCHES: 'lastPullSyncAt:branches',
  LAST_SYNC_AT: 'lastSyncAt',
  LAST_SYNC_REPORT_ID: 'lastSyncReportId',
  INITIAL_SYNC_COMPLETE: 'initialSyncComplete',
  DATA_SOURCE_CUSTOMERS: 'dataSource:customers',
  DATA_SOURCE_PRODUCTS: 'dataSource:products',
  DATA_SOURCE_USERS: 'dataSource:users',
  PROCESSED_PREFIX: 'processed:',
} as const;

class BeraViledaDatabase extends Dexie {
  meta!: EntityTable<LocalMeta, 'key'>;
  syncQueue!: EntityTable<LocalSyncQueueItem, 'id'>;
  syncReports!: EntityTable<LocalSyncReport, 'id'>;
  orders!: EntityTable<LocalOrder, 'id'>;
  orderLines!: EntityTable<LocalOrderLine, 'id'>;
  customers!: EntityTable<LocalCustomer, 'id'>;
  branches!: EntityTable<LocalBranch, 'id'>;
  products!: EntityTable<LocalProduct, 'id'>;
  importLogs!: EntityTable<LocalImportReport, 'id'>;
  users!: EntityTable<LocalUser, 'id'>;

  constructor() {
    super(DB_CONFIG.name);

    this.version(1).stores({
      meta: 'key',
      syncQueue: 'id, entityType, idempotencyKey, status, createdAt',
      orders:
        'id, localId, customerId, salesRepId, status, syncStatus, createdAt',
      orderLines: 'id, orderId, productId',
      customers: 'id, code, name, salesRepId, syncStatus',
      products: 'id, sku, name, syncStatus',
    });

    this.version(2).stores({
      meta: 'key',
      syncQueue:
        'id, entityType, entityId, idempotencyKey, status, createdAt',
      syncReports: 'id, startedAt, success',
      orders:
        'id, localId, customerId, salesRepId, status, syncStatus, erpId, createdAt',
      orderLines: 'id, orderId, productId, erpId',
      customers: 'id, code, name, salesRepId, syncStatus, erpId',
      products: 'id, sku, name, syncStatus, erpId, barcode',
    });

    this.version(3).stores({
      meta: 'key',
      syncQueue:
        'id, entityType, entityId, idempotencyKey, status, createdAt',
      syncReports: 'id, startedAt, success',
      orders:
        'id, localId, customerId, branchId, salesRepId, status, syncStatus, erpId, createdAt',
      orderLines: 'id, orderId, productId, erpId',
      customers:
        'id, code, name, salesRepId, syncStatus, erpId, isActive, isDeleted',
      branches:
        'id, customerId, name, isActive, isDeleted, syncStatus, erpId',
      products: 'id, sku, name, syncStatus, erpId, barcode',
    });

    this.version(4).stores({
      meta: 'key',
      syncQueue:
        'id, entityType, entityId, idempotencyKey, status, createdAt',
      syncReports: 'id, startedAt, success',
      orders:
        'id, localId, customerId, branchId, salesRepId, status, syncStatus, orderSyncStatus, erpId, isDeleted, createdAt',
      orderLines: 'id, orderId, productId, erpId',
      customers:
        'id, code, name, salesRepId, syncStatus, erpId, isActive, isDeleted',
      branches:
        'id, customerId, name, isActive, isDeleted, syncStatus, erpId',
      products: 'id, sku, name, syncStatus, erpId, barcode',
    });

    this.version(5).stores({
      meta: 'key',
      syncQueue:
        'id, entityType, entityId, idempotencyKey, status, createdAt',
      syncReports: 'id, startedAt, success',
      importLogs: 'id, type, startedAt, success',
      orders:
        'id, localId, customerId, branchId, salesRepId, status, syncStatus, orderSyncStatus, erpId, isDeleted, createdAt',
      orderLines: 'id, orderId, productId, erpId',
      customers:
        'id, code, name, salesRepId, syncStatus, erpId, isActive, isDeleted',
      branches:
        'id, customerId, name, isActive, isDeleted, syncStatus, erpId',
      products: 'id, sku, name, syncStatus, erpId, barcode',
    });

    this.version(6).stores({
      meta: 'key',
      syncQueue:
        'id, entityType, entityId, idempotencyKey, status, createdAt',
      syncReports: 'id, startedAt, success',
      importLogs: 'id, type, startedAt, success',
      users: 'id, userCode, role, active',
      orders:
        'id, localId, customerId, branchId, salesRepId, status, syncStatus, orderSyncStatus, erpId, isDeleted, createdAt',
      orderLines: 'id, orderId, productId, erpId',
      customers:
        'id, code, name, salesRepId, syncStatus, erpId, isActive, isDeleted',
      branches:
        'id, customerId, name, isActive, isDeleted, syncStatus, erpId',
      products: 'id, sku, name, syncStatus, erpId, barcode',
    });

    this.version(DB_CONFIG.version).stores({
      meta: 'key',
      syncQueue:
        'id, entityType, entityId, idempotencyKey, status, createdAt',
      syncReports: 'id, startedAt, success',
      importLogs: 'id, type, startedAt, success',
      users: 'id, userCode, role, active, syncStatus, isDeleted',
      orders:
        'id, localId, customerId, branchId, salesRepId, status, syncStatus, orderSyncStatus, erpId, isDeleted, createdAt',
      orderLines: 'id, orderId, productId, erpId',
      customers:
        'id, code, name, salesRepId, syncStatus, erpId, isActive, isDeleted',
      branches:
        'id, customerId, name, isActive, isDeleted, syncStatus, erpId',
      products: 'id, sku, name, syncStatus, erpId, barcode',
    });
  }
}

export const db = new BeraViledaDatabase();

export async function initDatabase(): Promise<void> {
  await db.open();
}

export async function getMetaValue(key: string): Promise<string | undefined> {
  const record = await db.meta.get(key);
  return record?.value;
}

export async function setMetaValue(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}

export async function isIdempotencyKeyProcessed(
  key: string,
): Promise<boolean> {
  const value = await getMetaValue(`${META_KEYS.PROCESSED_PREFIX}${key}`);
  return value === 'true';
}

export async function markIdempotencyKeyProcessed(
  key: string,
): Promise<void> {
  await setMetaValue(`${META_KEYS.PROCESSED_PREFIX}${key}`, 'true');
}
