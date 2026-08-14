import { isFirebaseConfigured } from '@/config/env';
import {
  db,
  getMetaValue,
  setMetaValue,
  META_KEYS,
} from '@/shared/lib/indexeddb/db';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import { branchLocalRepository } from '@/shared/lib/indexeddb/repositories/branchRepository';
import { userLocalRepository } from '@/shared/lib/indexeddb/repositories/userRepository';
import { fetchAllUsersFromFirestore } from '@/shared/lib/firebase/userFirestoreService';
import {
  normalizeAppUser,
  normalizeUserCode,
  type AppUser,
} from '@/shared/types/user.types';
import {
  pullAllCustomers,
  pullAllProducts,
  pullAllBranches,
  pullCustomersSince,
  pullProductsSince,
  pullBranchesSince,
} from '@/shared/lib/firebase/firestoreService';
import { conflictResolver } from './ConflictResolver';
import {
  applyLogoStockOverlays,
  buildLogoStockOverlayIndex,
  preserveLogoStockFields,
} from './logoStockAuthority';
import {
  buildPullValidation,
  readLoadedCounts,
  recordPullValidation,
} from './syncPullValidation';
import {
  logBranchesFetchEnd,
  logBranchesFetchStart,
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
import type { Customer, CustomerBranch } from '@/shared/types/customer.types';
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

function normalizeBranch(remote: CustomerBranch): CustomerBranch {
  return {
    ...remote,
    syncStatus: 'synced',
  };
}

function normalizeRemoteUser(remote: AppUser): AppUser {
  return normalizeAppUser({
    ...remote,
    syncStatus: 'synced',
  });
}

function preferLocalPendingBranch(
  local: CustomerBranch,
  remote: CustomerBranch,
): boolean {
  return (
    (local.syncStatus === 'pending' || local.syncStatus === 'failed') &&
    local.updatedAt >= remote.updatedAt
  );
}

/**
 * Merge remote users by business key (userCode).
 * Preserve local pending/failed rows that are newer or not yet on remote.
 */
export async function mergeUsersFromRemote(remotes: AppUser[]): Promise<number> {
  const locals = await userLocalRepository.findAll();
  const localByCode = new Map(
    locals.map((user) => [normalizeUserCode(user.userCode), user]),
  );
  const remoteByCode = new Map(
    remotes.map((user) => {
      const normalized = normalizeRemoteUser(user);
      return [normalized.userCode, normalized] as const;
    }),
  );

  const merged: AppUser[] = [];

  for (const [code, remote] of remoteByCode) {
    const local = localByCode.get(code);
    if (
      local &&
      (local.syncStatus === 'pending' || local.syncStatus === 'failed') &&
      local.updatedAt >= remote.updatedAt
    ) {
      merged.push(local);
    } else {
      merged.push(remote);
    }
  }

  for (const local of locals) {
    const code = normalizeUserCode(local.userCode);
    if (remoteByCode.has(code)) continue;
    if (local.syncStatus === 'pending' || local.syncStatus === 'failed') {
      merged.push(local);
    }
  }

  await userLocalRepository.replaceAll(merged);
  return merged.length;
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
      const resolved = conflictResolver.resolve(
        localByIdMatch,
        normalized,
      ).resolved;
      toSave.push(preserveLogoStockFields(localByIdMatch, resolved));
      continue;
    }

    const localBySkuMatch = localBySku.get(remote.sku);
    if (localBySkuMatch) {
      const resolved = conflictResolver.resolve(localBySkuMatch, {
        ...normalized,
        id: localBySkuMatch.id,
        localId: localBySkuMatch.localId,
      }).resolved;
      toSave.push(preserveLogoStockFields(localBySkuMatch, resolved));
      continue;
    }

    toSave.push(normalized);
  }

  await productLocalRepository.saveMany(toSave);
}

/**
 * Incremental branch merge by id. Soft-deleted remotes are stored so local
 * lists (which filter isDeleted) hide them. Pending/failed locals win when newer.
 */
export async function mergeBranchesBatch(
  remotes: CustomerBranch[],
): Promise<number> {
  if (remotes.length === 0) return 0;

  const locals = await branchLocalRepository.getAll();
  const localById = new Map(locals.map((branch) => [branch.id, branch]));
  const toSave: CustomerBranch[] = [];

  for (const remote of remotes) {
    const normalized = normalizeBranch(remote);
    const local = localById.get(remote.id);
    if (local && preferLocalPendingBranch(local, normalized)) {
      toSave.push(local);
    } else {
      toSave.push(normalized);
    }
  }

  await branchLocalRepository.saveMany(toSave);
  return toSave.length;
}

/**
 * Full branch replace from Firestore. Drops stale synced locals that are no
 * longer remote; keeps newer pending/failed locals so outbox push can finish.
 */
export async function replaceBranchesFromFirestore(
  remotes: CustomerBranch[],
): Promise<number> {
  const locals = await branchLocalRepository.getAll();
  const remoteById = new Map(
    remotes.map((branch) => [branch.id, normalizeBranch(branch)] as const),
  );
  const merged = new Map<string, CustomerBranch>();

  for (const [id, remote] of remoteById) {
    merged.set(id, remote);
  }

  for (const local of locals) {
    if (local.syncStatus !== 'pending' && local.syncStatus !== 'failed') {
      continue;
    }
    const remote = remoteById.get(local.id);
    if (!remote || preferLocalPendingBranch(local, remote)) {
      merged.set(local.id, local);
    }
  }

  const rows = [...merged.values()];
  await db.transaction('rw', [db.branches], async () => {
    await db.branches.clear();
    if (rows.length > 0) {
      await db.branches.bulkPut(rows);
    }
  });
  return rows.length;
}

async function replaceAllFromFirestore(
  remoteCustomers: Customer[],
  remoteProducts: Product[],
  remoteUsers: Awaited<ReturnType<typeof fetchAllUsersFromFirestore>>,
  remoteBranches: CustomerBranch[],
): Promise<{ skippedEmptyRemote: boolean; branchesWritten: number }> {
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

    // Users: merge when remote has rows; otherwise keep local users too.
    // Branches stay local when master replace is skipped.
    if (remoteUsers.length > 0) {
      const userCount = await mergeUsersFromRemote(remoteUsers);
      logIndexedDbWriteEnd(
        Date.now() - startedAt,
        `master korundu · ${String(userCount)} kullanıcı birleştirildi`,
      );
    } else {
      console.warn(
        `[Sync] Empty Firestore users — preserving local ${String(localCounts.users)} kullanıcı`,
      );
      logIndexedDbWriteEnd(Date.now() - startedAt, 'master + users korundu (remote boş)');
    }

    return { skippedEmptyRemote: true, branchesWritten: 0 };
  }

  const customers = remoteCustomers.map(normalizeCustomer);
  const localProducts = await productLocalRepository.getAll();
  const logoStockIndex = buildLogoStockOverlayIndex(localProducts);
  const products = applyLogoStockOverlays(
    remoteProducts.map(normalizeProduct),
    logoStockIndex,
  );

  logIndexedDbWriteStart();
  const startedAt = Date.now();

  // Full replace refreshes customers/products. Users merge by userCode and keep
  // pending local edits. Branches replace from Firestore and keep pending locals.
  // Logo-authoritative stockQuantity is restored via logoStockIndex after clear.
  await db.transaction('rw', [db.customers, db.products], async () => {
    await db.customers.clear();
    await db.products.clear();

    if (customers.length > 0) {
      await db.customers.bulkPut(customers);
    }
    if (products.length > 0) {
      await db.products.bulkPut(products);
    }
  });

  const branchesWritten = await replaceBranchesFromFirestore(remoteBranches);
  const userCount = await mergeUsersFromRemote(remoteUsers);

  logIndexedDbWriteEnd(
    Date.now() - startedAt,
    `${String(customers.length)} cari, ${String(products.length)} stok, ${String(branchesWritten)} şube, ${String(userCount)} kullanıcı`,
  );

  return { skippedEmptyRemote: false, branchesWritten };
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
  branches: CustomerBranch[];
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
    const remoteBranches = await runTimedFetch(
      logBranchesFetchStart,
      logBranchesFetchEnd,
      pullAllBranches,
      (rows) => rows.length,
    );

    return {
      customers: remoteCustomers,
      products: remoteProducts,
      users: remoteUsers,
      branches: remoteBranches,
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
  branches: CustomerBranch[];
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
    const branchSince =
      (await getMetaValue(META_KEYS.LAST_PULL_BRANCHES)) ?? EPOCH;
    const remoteBranches = await runTimedFetch(
      logBranchesFetchStart,
      logBranchesFetchEnd,
      () => pullBranchesSince(branchSince),
      (rows) => rows.length,
    );

    return {
      customers: remoteCustomers,
      products: remoteProducts,
      users: remoteUsers,
      branches: remoteBranches,
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
      branches: 0,
      full,
    };

    if (!isFirebaseConfigured() || !navigator.onLine) {
      return emptyStats;
    }

    logSyncStart();
    const now = new Date().toISOString();

    try {
      if (full) {
        const {
          customers: remoteCustomers,
          products: remoteProducts,
          users: remoteUsers,
          branches: remoteBranches,
        } = await fetchAllCollectionsSerial();

        const { skippedEmptyRemote, branchesWritten } =
          await replaceAllFromFirestore(
            remoteCustomers,
            remoteProducts,
            remoteUsers,
            remoteBranches,
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
        await setMetaValue(META_KEYS.LAST_PULL_BRANCHES, now);
        if (!skippedEmptyRemote) {
          await setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore');
          await setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore');
        }
        await setMetaValue(META_KEYS.INITIAL_SYNC_COMPLETE, 'true');

        logSyncComplete();

        const localBranchCount = (await branchLocalRepository.getAll()).length;

        return {
          customers: skippedEmptyRemote
            ? loaded.customers
            : remoteCustomers.length,
          products: skippedEmptyRemote
            ? loaded.products
            : remoteProducts.length,
          users: skippedEmptyRemote ? loaded.users : remoteUsers.length,
          branches: skippedEmptyRemote ? localBranchCount : branchesWritten,
          validation,
          full: true,
          skippedEmptyRemote,
        };
      }

      const {
        customers: remoteCustomers,
        products: remoteProducts,
        users: remoteUsers,
        branches: remoteBranches,
      } = await fetchIncrementalCollections();

      await mergeCustomersBatch(remoteCustomers);
      await mergeProductsBatch(remoteProducts);
      const branchesWritten = await mergeBranchesBatch(remoteBranches);

      logIndexedDbWriteStart();
      const usersWriteStartedAt = Date.now();
      const userCount = await mergeUsersFromRemote(remoteUsers);
      logIndexedDbWriteEnd(
        Date.now() - usersWriteStartedAt,
        `${String(userCount)} kullanıcı`,
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
      await setMetaValue(META_KEYS.LAST_PULL_BRANCHES, now);
      await setMetaValue(META_KEYS.DATA_SOURCE_CUSTOMERS, 'firestore');
      await setMetaValue(META_KEYS.DATA_SOURCE_PRODUCTS, 'firestore');

      logSyncComplete();

      return {
        customers: remoteCustomers.length,
        products: remoteProducts.length,
        users: remoteUsers.length,
        branches: branchesWritten,
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
