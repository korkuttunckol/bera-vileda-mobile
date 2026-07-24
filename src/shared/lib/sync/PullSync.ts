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
  beginSyncStep,
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

async function mergeCustomersBatch(remotes: Customer[]): Promise<void> {
  if (remotes.length === 0) return;

  const finishMerge = beginSyncStep('Customers IndexedDB merge');
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
  finishMerge(`${String(toSave.length)} kayıt`);
}

async function mergeProductsBatch(remotes: Product[]): Promise<void> {
  if (remotes.length === 0) return;

  const finishMerge = beginSyncStep('Products IndexedDB merge');
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
  finishMerge(`${String(toSave.length)} kayıt`);
}

async function replaceAllFromFirestore(
  remoteCustomers: Customer[],
  remoteProducts: Product[],
  remoteUsers: Awaited<ReturnType<typeof fetchAllUsersFromFirestore>>,
): Promise<void> {
  const customers = remoteCustomers.map(normalizeCustomer);
  const products = remoteProducts.map(normalizeProduct);

  const finishWrite = beginSyncStep('IndexedDB write');
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
  finishWrite(
    `${String(customers.length)} cari, ${String(products.length)} stok, ${String(remoteUsers.length)} kullanıcı`,
  );
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
  const finishSinceRead = beginSyncStep('Incremental since meta read');
  const customerSince =
    (await getMetaValue(META_KEYS.LAST_PULL_CUSTOMERS)) ?? EPOCH;
  const productSince =
    (await getMetaValue(META_KEYS.LAST_PULL_PRODUCTS)) ?? EPOCH;
  finishSinceRead();

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

    const pullStartedAt = Date.now();
    logSyncStarted(full ? 'full' : 'incremental');
    const now = new Date().toISOString();

    try {
      if (full) {
        const finishFetch = beginSyncStep('Firestore fetch (full)');
        const { customers: remoteCustomers, products: remoteProducts, users: remoteUsers } =
          await fetchAllCollectionsSerial();
        finishFetch();

        await replaceAllFromFirestore(remoteCustomers, remoteProducts, remoteUsers);

        const finishValidation = beginSyncStep('Validation');
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
        finishValidation();

        const finishMeta = beginSyncStep('Meta update (full)');
        await setMetaValue(META_KEYS.LAST_PULL_CUSTOMERS, now);
        await setMetaValue(META_KEYS.LAST_PULL_PRODUCTS, now);
        await setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore');
        await setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore');
        await setMetaValue(META_KEYS.INITIAL_SYNC_COMPLETE, 'true');
        finishMeta();

        logSyncCompleted(Date.now() - pullStartedAt);

        return {
          customers: remoteCustomers.length,
          products: remoteProducts.length,
          users: remoteUsers.length,
          validation,
          full: true,
        };
      }

      const finishFetch = beginSyncStep('Firestore fetch (incremental)');
      const {
        customers: remoteCustomers,
        products: remoteProducts,
        users: remoteUsers,
      } = await fetchIncrementalCollections();
      finishFetch();

      await mergeCustomersBatch(remoteCustomers);
      await mergeProductsBatch(remoteProducts);

      const finishUsersWrite = beginSyncStep('Users IndexedDB write');
      await db.transaction('rw', db.users, async () => {
        await db.users.clear();
        if (remoteUsers.length > 0) {
          await db.users.bulkPut(remoteUsers);
        }
      });
      finishUsersWrite(`${String(remoteUsers.length)} kullanıcı`);

      const finishValidation = beginSyncStep('Validation');
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
      finishValidation();

      const finishMeta = beginSyncStep('Meta update (incremental)');
      await setMetaValue(META_KEYS.LAST_PULL_CUSTOMERS, now);
      await setMetaValue(META_KEYS.LAST_PULL_PRODUCTS, now);
      await setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore');
      await setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore');
      finishMeta();

      logSyncCompleted(Date.now() - pullStartedAt);

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
