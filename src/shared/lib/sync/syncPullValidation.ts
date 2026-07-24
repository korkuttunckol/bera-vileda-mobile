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

export class SyncValidationError extends Error {
  readonly validation: SyncPullValidation;

  constructor(message: string, validation: SyncPullValidation) {
    super(message);
    this.name = 'SyncValidationError';
    this.validation = validation;
  }
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
    console.error('[Sync] Kayıt sayısı doğrulaması başarısız:', validation);
  } else {
    console.info(
      `[Sync] Kayıt sayısı doğrulaması başarılı (${validation.mode}).`,
    );
  }
}

export function assertPullValidation(validation: SyncPullValidation): void {
  logPullValidation(validation);

  if (validation.valid) {
    return;
  }

  const mismatches: string[] = [];

  const check = (
    label: string,
    counts: EntityPullCounts,
  ): void => {
    if (validation.mode === 'full' && isFullCountMismatch(counts)) {
      mismatches.push(
        `${label} (fetched=${String(counts.fetched)}, written=${String(counts.written)}, loaded=${String(counts.loaded)})`,
      );
      return;
    }

    if (validation.mode === 'incremental' && isIncrementalBatchMismatch(counts)) {
      mismatches.push(
        `${label} (fetched=${String(counts.fetched)}, written=${String(counts.written)})`,
      );
    }
  };

  check('Cari', validation.customers);
  check('Stok', validation.products);
  check('Kullanıcı', validation.users);

  throw new SyncValidationError(
    `Senkronizasyon doğrulaması başarısız: ${mismatches.join('; ')}`,
    validation,
  );
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
