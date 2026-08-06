import { isFirebaseConfigured } from '@/config/env';
import {
  customerLocalRepository,
  filterCustomers,
} from '@/shared/lib/indexeddb/repositories/customerRepository';
import {
  productLocalRepository,
} from '@/shared/lib/indexeddb/repositories/productRepository';
import { userLocalRepository } from '@/shared/lib/indexeddb/repositories/userRepository';
import {
  getMetaValue,
  META_KEYS,
} from '@/shared/lib/indexeddb/db';
import type {
  DataSourceSnapshot,
  DataStatsSnapshot,
  EntityDataSource,
} from '@/shared/lib/sync/dataSource.types';

function parseDataSource(value: string | undefined): EntityDataSource {
  if (value === 'firestore' || value === 'indexeddb' || value === 'localStorage') {
    return value;
  }
  return 'indexeddb';
}

async function readDataSources(): Promise<DataSourceSnapshot> {
  const [customers, products, users, lastSyncAt] = await Promise.all([
    getMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS),
    getMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS),
    getMetaValue(META_KEYS.DATA_SOURCE_USERS),
    getMetaValue(META_KEYS.LAST_SYNC_AT),
  ]);

  return {
    customers: parseDataSource(customers),
    products: parseDataSource(products),
    users: parseDataSource(users),
    auth: 'localStorage',
    readFrom: 'indexeddb',
    lastFirestoreSyncAt: lastSyncAt ?? null,
  };
}

class DataStatsService {
  async getStats(): Promise<DataStatsSnapshot> {
    const [allCustomers, activeProducts, users, sources] = await Promise.all([
      customerLocalRepository.getAll(),
      productLocalRepository.findActiveNotDeleted(),
      userLocalRepository.findAllNotDeleted(),
      readDataSources(),
    ]);

    const customerCount = filterCustomers(allCustomers, {
      activeFilter: 'all',
    }).length;

    return {
      customerCount,
      productCount: activeProducts.length,
      userCount: users.length,
      sources,
    };
  }

  async markFirestoreSynced(): Promise<void> {
    // Meta keys are written by PullSync / syncService.
  }

  async getDataSources(): Promise<DataSourceSnapshot> {
    return readDataSources();
  }

  isFirestoreConfigured(): boolean {
    return isFirebaseConfigured();
  }
}

export const dataStatsService = new DataStatsService();
