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
  assertPullValidation,
  buildPullValidation,
  readLoadedCounts,
} from './syncPullValidation';
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
}

async function pullUsersFromFirestore(): Promise<
  Awaited<ReturnType<typeof fetchAllUsersFromFirestore>>
> {
  const remoteUsers = await fetchAllUsersFromFirestore();
  await setMetaValue(META_KEYS.DATA_SOURCE_USERS, 'firestore');
  return remoteUsers;
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

    if (full) {
      const remoteCustomers = await pullAllCustomers();
      const remoteProducts = await pullAllProducts();
      const remoteUsers = await pullUsersFromFirestore();

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

      assertPullValidation(validation);

      await setMetaValue(META_KEYS.LAST_PULL_CUSTOMERS, now);
      await setMetaValue(META_KEYS.LAST_PULL_PRODUCTS, now);
      await setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore');
      await setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore');
      await setMetaValue(META_KEYS.INITIAL_SYNC_COMPLETE, 'true');

      return {
        customers: remoteCustomers.length,
        products: remoteProducts.length,
        users: remoteUsers.length,
        validation,
        full: true,
      };
    }

    const customerSince =
      (await getMetaValue(META_KEYS.LAST_PULL_CUSTOMERS)) ?? EPOCH;
    const productSince =
      (await getMetaValue(META_KEYS.LAST_PULL_PRODUCTS)) ?? EPOCH;

    const remoteCustomers = await pullCustomersSince(customerSince);
    const remoteProducts = await pullProductsSince(productSince);

    for (const remote of remoteCustomers) {
      await mergeCustomer(remote);
    }

    for (const remote of remoteProducts) {
      await mergeProduct(remote);
    }

    const remoteUsers = await pullUsersFromFirestore();
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

    assertPullValidation(validation);

    await setMetaValue(META_KEYS.LAST_PULL_CUSTOMERS, now);
    await setMetaValue(META_KEYS.LAST_PULL_PRODUCTS, now);
    await setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore');
    await setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore');

    return {
      customers: remoteCustomers.length,
      products: remoteProducts.length,
      users: remoteUsers.length,
      validation,
      full: false,
    };
  }
}

export const pullSync = new PullSync();
