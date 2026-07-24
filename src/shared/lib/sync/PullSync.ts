import { isFirebaseConfigured } from '@/config/env';
import {
  getMetaValue,
  setMetaValue,
  META_KEYS,
} from '@/shared/lib/indexeddb/db';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import { userLocalRepository } from '@/shared/lib/indexeddb/repositories/userRepository';
import { fetchAllUsersFromFirestore } from '@/shared/lib/firebase/userFirestoreService';
import {
  pullAllCustomers,
  pullAllProducts,
  pullCustomersSince,
  pullProductsSince,
} from '@/shared/lib/firebase/firestoreService';
import { conflictResolver } from './ConflictResolver';
import type { SyncPullStats } from './types/sync.types';

const EPOCH = '1970-01-01T00:00:00.000Z';

export interface PullSyncOptions {
  full?: boolean;
}

async function mergeCustomer(remote: Awaited<ReturnType<typeof pullCustomersSince>>[number]): Promise<void> {
  const normalized = {
    ...remote,
    syncStatus: 'synced' as const,
  };
  const local = await customerLocalRepository.getById(remote.id);
  if (local) {
    const { resolved } = conflictResolver.resolve(local, normalized);
    await customerLocalRepository.save(resolved);
  } else {
    await customerLocalRepository.save(normalized);
  }
}

async function mergeProduct(remote: Awaited<ReturnType<typeof pullProductsSince>>[number]): Promise<void> {
  const normalized = {
    ...remote,
    syncStatus: 'synced' as const,
  };
  const localById = await productLocalRepository.getById(remote.id);
  if (localById) {
    const { resolved } = conflictResolver.resolve(localById, normalized);
    await productLocalRepository.save(resolved);
  } else {
    const localBySku = await productLocalRepository.findBySku(remote.sku);
    if (localBySku) {
      const { resolved } = conflictResolver.resolve(localBySku, {
        ...normalized,
        id: localBySku.id,
        localId: localBySku.localId,
      });
      await productLocalRepository.save(resolved);
    } else {
      await productLocalRepository.save(normalized);
    }
  }
}

async function pullUsers(): Promise<number> {
  if (!isFirebaseConfigured() || !navigator.onLine) {
    return 0;
  }

  try {
    const remoteUsers = await fetchAllUsersFromFirestore();
    await userLocalRepository.upsertMany(remoteUsers);
    await setMetaValue(META_KEYS.DATA_SOURCE_USERS, 'firestore');
    return remoteUsers.length;
  } catch (error) {
    console.error('[PullSync] Kullanıcı çekme hatası:', error);
    await setMetaValue(META_KEYS.DATA_SOURCE_USERS, 'indexeddb');
    throw error;
  }
}

export class PullSync {
  async needsInitialSync(): Promise<boolean> {
    const initialComplete = await getMetaValue(META_KEYS.INITIAL_SYNC_COMPLETE);
    if (initialComplete !== 'true') {
      return true;
    }

    if (!isFirebaseConfigured() || !navigator.onLine) {
      return false;
    }

    const lastSyncAt = await getMetaValue(META_KEYS.LAST_SYNC_AT);
    return !lastSyncAt;
  }

  async pullAll(options: PullSyncOptions = {}): Promise<SyncPullStats> {
    const stats: SyncPullStats = { customers: 0, products: 0, users: 0 };
    const full = options.full === true;
    const now = new Date().toISOString();

    if (!isFirebaseConfigured() || !navigator.onLine) {
      return stats;
    }

    let remoteCustomers: Awaited<ReturnType<typeof pullAllCustomers>>;
    let remoteProducts: Awaited<ReturnType<typeof pullAllProducts>>;

    if (full) {
      remoteCustomers = await pullAllCustomers();
      remoteProducts = await pullAllProducts();
    } else {
      const customerSince =
        (await getMetaValue(META_KEYS.LAST_PULL_CUSTOMERS)) ?? EPOCH;
      const productSince =
        (await getMetaValue(META_KEYS.LAST_PULL_PRODUCTS)) ?? EPOCH;
      remoteCustomers = await pullCustomersSince(customerSince);
      remoteProducts = await pullProductsSince(productSince);
    }

    for (const remote of remoteCustomers) {
      await mergeCustomer(remote);
      stats.customers += 1;
    }

    for (const remote of remoteProducts) {
      await mergeProduct(remote);
      stats.products += 1;
    }

    stats.users = await pullUsers();

    await setMetaValue(META_KEYS.LAST_PULL_CUSTOMERS, now);
    await setMetaValue(META_KEYS.LAST_PULL_PRODUCTS, now);
    await setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore');
    await setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore');
    await setMetaValue(META_KEYS.INITIAL_SYNC_COMPLETE, 'true');

    return stats;
  }
}

export const pullSync = new PullSync();
