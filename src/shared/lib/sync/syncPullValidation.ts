import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import { userLocalRepository } from '@/shared/lib/indexeddb/repositories/userRepository';

export interface EntityPullCounts {
  fetched: number;
  written: number;
  loaded: number;
}

export interface SyncPullValidation {
  customers: EntityPullCounts;
  products: EntityPullCounts;
  users: EntityPullCounts;
  valid: boolean;
  mode: 'full' | 'incremental';
}

function isFullCountMismatch(counts: EntityPullCounts): boolean {
  return counts.fetched !== counts.written || counts.written !== counts.loaded;
}

function isIncrementalBatchMismatch(counts: EntityPullCounts): boolean {
  return counts.fetched !== counts.written;
}

export function buildPullValidation(
  customers: EntityPullCounts,
  products: EntityPullCounts,
  users: EntityPullCounts,
  mode: 'full' | 'incremental',
): SyncPullValidation {
  const valid =
    mode === 'full'
      ? !isFullCountMismatch(customers) &&
        !isFullCountMismatch(products) &&
        !isFullCountMismatch(users)
      : !isIncrementalBatchMismatch(customers) &&
        !isIncrementalBatchMismatch(products) &&
        !isIncrementalBatchMismatch(users);

  return {
    customers,
    products,
    users,
    valid,
    mode,
  };
}

export function logPullValidation(validation: SyncPullValidation): void {
  console.info('[Sync] Customers fetched:', validation.customers.fetched);
  console.info('[Sync] Products fetched:', validation.products.fetched);
  console.info('[Sync] Users fetched:', validation.users.fetched);
  console.info('[Sync] Customers written:', validation.customers.written);
  console.info('[Sync] Products written:', validation.products.written);
  console.info('[Sync] Users written:', validation.users.written);
  console.info('[Sync] Customers loaded:', validation.customers.loaded);
  console.info('[Sync] Products loaded:', validation.products.loaded);
  console.info('[Sync] Users loaded:', validation.users.loaded);

  if (!validation.valid) {
    console.warn('[Sync] Kayıt sayısı uyumsuzluğu (senkronizasyon devam ediyor):', validation);
  } else {
    console.info(
      `[Sync] Kayıt sayısı doğrulaması başarılı (${validation.mode}).`,
    );
  }
}

/** Sayım uyumsuzluğunda senkronizasyonu durdurmaz; yalnızca loglar. */
export function recordPullValidation(validation: SyncPullValidation): void {
  logPullValidation(validation);
}

export async function readLoadedCounts(): Promise<{
  customers: number;
  products: number;
  users: number;
}> {
  const [customers, products, users] = await Promise.all([
    customerLocalRepository.getAll(),
    productLocalRepository.getAll(),
    userLocalRepository.findAll(),
  ]);

  return {
    customers: customers.length,
    products: products.length,
    users: users.length,
  };
}
