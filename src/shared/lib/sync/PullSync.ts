import { isFirebaseConfigured } from '@/config/env';
import {
  db,
  getMetaValue,
  setMetaValue,
  META_KEYS,
} from '@/shared/lib/indexeddb/db';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import { fetchAllUsersFromFirestore } from '@/shared/lib/firebase/userFirestoreService';
import {
  pullAllCustomers,
  pullAllProducts,
  pullCustomersSince,
  pullProductsSince,
} from '@/shared/lib/firebase/firestoreService';
import { conflictResolver } from './ConflictResolver';
import {
  buildPullValidation,
  readLoadedCounts,
  recordPullValidation,
} from './syncPullValidation';
import {
  logSyncCompleted,
  logSyncFailed,
  logSyncStarted,
  runLoggedCollectionPull,
  wrapCollectionError,
} from './syncPullLogger';
import type { SyncPullStats } from './types/sync.types';
import type { Customer } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';

const EPOCH = '1970-01-01T00:00:00.000Z';

export interface PullSyncOptions {
  full?: boolean;
}

function normalizeCustomer(remote: Customer): Customer {
  return {
    ...remote,
    syncStatus: 'synced',
  };
}

function normalizeProduct(remote: Product): Product {
  return {
    ...remote,
    syncStatus: 'synced',
  };
}

async function mergeCustomer(remote: Customer): Promise<void> {
  const normalized = normalizeCustomer(remote);
  const local = await customerLocalRepository.getById(remote.id);
  if (local) {
    const { resolved } = conflictResolver.resolve(local, normalized);
    await customerLocalRepository.save(resolved);
  } else {
    await customerLocalRepository.save(normalized);
  }
}

async function mergeProduct(remote: Product): Promise<void> {
  const normalized = normalizeProduct(remote);
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

async function replaceAllFromFirestore(
  remoteCustomers: Customer[],
  remoteProducts: Product[],
  remoteUsers: Awaited<ReturnType<typeof fetchAllUsersFromFirestore>>,
): Promise<void> {
  const customers = remoteCustomers.map(normalizeCustomer);
  const products = remoteProducts.map(normalizeProduct);

  console.info('[Sync] IndexedDB yazılıyor (Customers, Products, Users)...');
  await db.transaction('rw', [db.customers, db.branches, db.products, db.users], async () => {
    await db.customers.clear();
    await db.branches.clear();
    await db.products.clear();
    await db.users.clear();

    if (customers.length > 0) {
      await db.customers.bulkPut(customers);
    }
    if (products.length > 0) {
      await db.products.bulkPut(products);
    }
    if (remoteUsers.length > 0) {
      await db.users.bulkPut(remoteUsers);
    }
  });
  console.info('[Sync] IndexedDB yazma tamamlandı');
}

async function pullUsersFromFirestore(): Promise<
  Awaited<ReturnType<typeof fetchAllUsersFromFirestore>>
> {
  const remoteUsers = await fetchAllUsersFromFirestore();
  await setMetaValue(META_KEYS.DATA_SOURCE_USERS, 'firestore');
  return remoteUsers;
}

async function fetchAllCollectionsSerial(): Promise<{
  customers: Customer[];
  products: Product[];
  users: Awaited<ReturnType<typeof fetchAllUsersFromFirestore>>;
}> {
  logSyncStarted();

  try {
    const remoteCustomers = await runLoggedCollectionPull(
      'Customers',
      pullAllCustomers,
      (rows) => rows.length,
    );
    const remoteProducts = await runLoggedCollectionPull(
      'Products',
      pullAllProducts,
      (rows) => rows.length,
    );
    const remoteUsers = await runLoggedCollectionPull(
      'Users',
      pullUsersFromFirestore,
      (rows) => rows.length,
    );

    return {
      customers: remoteCustomers,
      products: remoteProducts,
      users: remoteUsers,
    };
  } catch (error) {
    logSyncFailed(error);
    throw error instanceof Error ? error : wrapCollectionError('Customers', error);
  }
}

async function fetchIncrementalCollections(): Promise<{
  customers: Customer[];
  products: Product[];
  users: Awaited<ReturnType<typeof fetchAllUsersFromFirestore>>;
}> {
  logSyncStarted();

  const customerSince =
    (await getMetaValue(META_KEYS.LAST_PULL_CUSTOMERS)) ?? EPOCH;
  const productSince =
    (await getMetaValue(META_KEYS.LAST_PULL_PRODUCTS)) ?? EPOCH;

  try {
    const remoteCustomers = await runLoggedCollectionPull(
      'Customers',
      () => pullCustomersSince(customerSince),
      (rows) => rows.length,
    );
    const remoteProducts = await runLoggedCollectionPull(
      'Products',
      () => pullProductsSince(productSince),
      (rows) => rows.length,
    );
    const remoteUsers = await runLoggedCollectionPull(
      'Users',
      pullUsersFromFirestore,
      (rows) => rows.length,
    );

    return {
      customers: remoteCustomers,
      products: remoteProducts,
      users: remoteUsers,
    };
  } catch (error) {
    logSyncFailed(error);
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
    const full = options.full === true;
    const emptyStats: SyncPullStats = {
      customers: 0,
      products: 0,
      users: 0,
      full,
    };

    if (!isFirebaseConfigured() || !navigator.onLine) {
      return emptyStats;
    }

    const now = new Date().toISOString();

    try {
      if (full) {
        const { customers: remoteCustomers, products: remoteProducts, users: remoteUsers } =
          await fetchAllCollectionsSerial();

        await replaceAllFromFirestore(remoteCustomers, remoteProducts, remoteUsers);

        const loaded = await readLoadedCounts();
        const validation = buildPullValidation(
          {
            fetched: remoteCustomers.length,
            written: remoteCustomers.length,
            loaded: loaded.customers,
          },
          {
            fetched: remoteProducts.length,
            written: remoteProducts.length,
            loaded: loaded.products,
          },
          {
            fetched: remoteUsers.length,
            written: remoteUsers.length,
            loaded: loaded.users,
          },
          'full',
        );

        recordPullValidation(validation);

        await setMetaValue(META_KEYS.LAST_PULL_CUSTOMERS, now);
        await setMetaValue(META_KEYS.LAST_PULL_PRODUCTS, now);
        await setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore');
        await setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore');
        await setMetaValue(META_KEYS.INITIAL_SYNC_COMPLETE, 'true');

        logSyncCompleted();

        return {
          customers: remoteCustomers.length,
          products: remoteProducts.length,
          users: remoteUsers.length,
          validation,
          full: true,
        };
      }

      const {
        customers: remoteCustomers,
        products: remoteProducts,
        users: remoteUsers,
      } = await fetchIncrementalCollections();

      for (const remote of remoteCustomers) {
        await mergeCustomer(remote);
      }

      for (const remote of remoteProducts) {
        await mergeProduct(remote);
      }

      await db.transaction('rw', db.users, async () => {
        await db.users.clear();
        if (remoteUsers.length > 0) {
          await db.users.bulkPut(remoteUsers);
        }
      });

      const loaded = await readLoadedCounts();
      const validation = buildPullValidation(
        {
          fetched: remoteCustomers.length,
          written: remoteCustomers.length,
          loaded: loaded.customers,
        },
        {
          fetched: remoteProducts.length,
          written: remoteProducts.length,
          loaded: loaded.products,
        },
        {
          fetched: remoteUsers.length,
          written: remoteUsers.length,
          loaded: loaded.users,
        },
        'incremental',
      );

      recordPullValidation(validation);

      await setMetaValue(META_KEYS.LAST_PULL_CUSTOMERS, now);
      await setMetaValue(META_KEYS.LAST_PULL_PRODUCTS, now);
      await setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore');
      await setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore');

      logSyncCompleted();

      return {
        customers: remoteCustomers.length,
        products: remoteProducts.length,
        users: remoteUsers.length,
        validation,
        full: false,
      };
    } catch (error) {
      logSyncFailed(error);
      throw error;
    }
  }
}

export const pullSync = new PullSync();
