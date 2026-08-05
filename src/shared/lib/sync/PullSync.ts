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
  logCustomersFetchEnd,
  logCustomersFetchStart,
  logIndexedDbWriteEnd,
  logIndexedDbWriteStart,
  logProductsFetchEnd,
  logProductsFetchStart,
  logSyncComplete,
  logSyncFailed,
  logSyncStart,
  logUsersFetchEnd,
  logUsersFetchStart,
  runTimedFetch,
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

async function mergeCustomersBatch(remotes: Customer[]): Promise<void> {
  if (remotes.length === 0) return;

  const locals = await customerLocalRepository.getAll();
  const localById = new Map(locals.map((customer) => [customer.id, customer]));
  const toSave: Customer[] = [];

  for (const remote of remotes) {
    const normalized = normalizeCustomer(remote);
    const local = localById.get(remote.id);
    if (local) {
      toSave.push(conflictResolver.resolve(local, normalized).resolved);
    } else {
      toSave.push(normalized);
    }
  }

  await customerLocalRepository.saveMany(toSave);
}

async function mergeProductsBatch(remotes: Product[]): Promise<void> {
  if (remotes.length === 0) return;

  const locals = await productLocalRepository.getAll();
  const localById = new Map(locals.map((product) => [product.id, product]));
  const localBySku = new Map(locals.map((product) => [product.sku, product]));
  const toSave: Product[] = [];

  for (const remote of remotes) {
    const normalized = normalizeProduct(remote);
    const localByIdMatch = localById.get(remote.id);
    if (localByIdMatch) {
      toSave.push(conflictResolver.resolve(localByIdMatch, normalized).resolved);
      continue;
    }

    const localBySkuMatch = localBySku.get(remote.sku);
    if (localBySkuMatch) {
      toSave.push(
        conflictResolver.resolve(localBySkuMatch, {
          ...normalized,
          id: localBySkuMatch.id,
          localId: localBySkuMatch.localId,
        }).resolved,
      );
      continue;
    }

    toSave.push(normalized);
  }

  await productLocalRepository.saveMany(toSave);
}

async function replaceAllFromFirestore(
  remoteCustomers: Customer[],
  remoteProducts: Product[],
  remoteUsers: Awaited<ReturnType<typeof fetchAllUsersFromFirestore>>,
): Promise<{ skippedEmptyRemote: boolean }> {
  const localCounts = await readLoadedCounts();
  const remoteMasterEmpty =
    remoteCustomers.length === 0 && remoteProducts.length === 0;
  const localMasterHasData =
    localCounts.customers > 0 || localCounts.products > 0;

  // Never wipe local master data with an empty Firestore snapshot (Excel import
  // lives only in IndexedDB until the upload tool seeds the cloud).
  if (remoteMasterEmpty && localMasterHasData) {
    console.warn(
      `[Sync] Empty Firestore master data — preserving local ` +
        `${String(localCounts.customers)} cari / ${String(localCounts.products)} stok`,
    );

    logIndexedDbWriteStart();
    const startedAt = Date.now();

    // Users: only replace when remote has rows; otherwise keep local users too.
    if (remoteUsers.length > 0) {
      await db.transaction('rw', db.users, async () => {
        await db.users.clear();
        await db.users.bulkPut(remoteUsers);
      });
      logIndexedDbWriteEnd(
        Date.now() - startedAt,
        `master korundu · ${String(remoteUsers.length)} kullanıcı güncellendi`,
      );
    } else {
      console.warn(
        `[Sync] Empty Firestore users — preserving local ${String(localCounts.users)} kullanıcı`,
      );
      logIndexedDbWriteEnd(Date.now() - startedAt, 'master + users korundu (remote boş)');
    }

    return { skippedEmptyRemote: true };
  }

  const customers = remoteCustomers.map(normalizeCustomer);
  const products = remoteProducts.map(normalizeProduct);

  logIndexedDbWriteStart();
  const startedAt = Date.now();

  // Full replace only refreshes customers/products/users. Branches stay local until a
  // dedicated branch pull exists — clearing them here wiped offline branch data.
  await db.transaction('rw', [db.customers, db.products, db.users], async () => {
    await db.customers.clear();
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

  logIndexedDbWriteEnd(
    Date.now() - startedAt,
    `${String(customers.length)} cari, ${String(products.length)} stok, ${String(remoteUsers.length)} kullanıcı`,
  );

  return { skippedEmptyRemote: false };
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
  try {
    const remoteUsers = await runTimedFetch(
      logUsersFetchStart,
      logUsersFetchEnd,
      pullUsersFromFirestore,
      (rows) => rows.length,
    );
    const remoteCustomers = await runTimedFetch(
      logCustomersFetchStart,
      logCustomersFetchEnd,
      pullAllCustomers,
      (rows) => rows.length,
    );
    const remoteProducts = await runTimedFetch(
      logProductsFetchStart,
      logProductsFetchEnd,
      pullAllProducts,
      (rows) => rows.length,
    );

    return {
      customers: remoteCustomers,
      products: remoteProducts,
      users: remoteUsers,
    };
  } catch (error) {
    logSyncFailed(error);
    throw error instanceof Error ? error : wrapCollectionError('FETCH', error);
  }
}

async function fetchIncrementalCollections(): Promise<{
  customers: Customer[];
  products: Product[];
  users: Awaited<ReturnType<typeof fetchAllUsersFromFirestore>>;
}> {
  try {
    const remoteUsers = await runTimedFetch(
      logUsersFetchStart,
      logUsersFetchEnd,
      pullUsersFromFirestore,
      (rows) => rows.length,
    );
    const customerSince =
      (await getMetaValue(META_KEYS.LAST_PULL_CUSTOMERS)) ?? EPOCH;
    const remoteCustomers = await runTimedFetch(
      logCustomersFetchStart,
      logCustomersFetchEnd,
      () => pullCustomersSince(customerSince),
      (rows) => rows.length,
    );
    const productSince =
      (await getMetaValue(META_KEYS.LAST_PULL_PRODUCTS)) ?? EPOCH;
    const remoteProducts = await runTimedFetch(
      logProductsFetchStart,
      logProductsFetchEnd,
      () => pullProductsSince(productSince),
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
    return initialComplete !== 'true';
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

    logSyncStart();
    const now = new Date().toISOString();

    try {
      if (full) {
        const { customers: remoteCustomers, products: remoteProducts, users: remoteUsers } =
          await fetchAllCollectionsSerial();

        const { skippedEmptyRemote } = await replaceAllFromFirestore(
          remoteCustomers,
          remoteProducts,
          remoteUsers,
        );

        const loaded = await readLoadedCounts();
        const validation = skippedEmptyRemote
          ? {
              customers: {
                fetched: remoteCustomers.length,
                written: 0,
                loaded: loaded.customers,
              },
              products: {
                fetched: remoteProducts.length,
                written: 0,
                loaded: loaded.products,
              },
              users: {
                fetched: remoteUsers.length,
                written: remoteUsers.length > 0 ? remoteUsers.length : 0,
                loaded: loaded.users,
              },
              valid: true,
              mode: 'full' as const,
            }
          : buildPullValidation(
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
        if (!skippedEmptyRemote) {
          await setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore');
          await setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore');
        }
        await setMetaValue(META_KEYS.INITIAL_SYNC_COMPLETE, 'true');

        logSyncComplete();

        return {
          customers: skippedEmptyRemote
            ? loaded.customers
            : remoteCustomers.length,
          products: skippedEmptyRemote
            ? loaded.products
            : remoteProducts.length,
          users: skippedEmptyRemote ? loaded.users : remoteUsers.length,
          validation,
          full: true,
          skippedEmptyRemote,
        };
      }

      const {
        customers: remoteCustomers,
        products: remoteProducts,
        users: remoteUsers,
      } = await fetchIncrementalCollections();

      await mergeCustomersBatch(remoteCustomers);
      await mergeProductsBatch(remoteProducts);

      logIndexedDbWriteStart();
      const usersWriteStartedAt = Date.now();
      await db.transaction('rw', db.users, async () => {
        await db.users.clear();
        if (remoteUsers.length > 0) {
          await db.users.bulkPut(remoteUsers);
        }
      });
      logIndexedDbWriteEnd(
        Date.now() - usersWriteStartedAt,
        `${String(remoteUsers.length)} kullanıcı`,
      );

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

      logSyncComplete();

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
