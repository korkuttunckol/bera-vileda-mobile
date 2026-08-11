import {
  doc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { isFirebaseConfigured } from '@/config/env';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import { branchLocalRepository } from '@/shared/lib/indexeddb/repositories/branchRepository';
import { userLocalRepository } from '@/shared/lib/indexeddb/repositories/userRepository';
import { getFirestoreDb } from '@/shared/lib/firebase/firestore';
import {
  pullAllCustomers,
  pullAllProducts,
} from '@/shared/lib/firebase/firestoreService';
import { upsertUserToFirestore } from '@/shared/lib/firebase/userFirestoreService';
import {
  branchConverter,
  customerConverter,
  productConverter,
} from '@/shared/lib/firebase/converters';
import { getFirestoreErrorMessage } from '@/shared/lib/firebase/firestoreUtils';
import type { Customer, CustomerBranch } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';
import type { AppUser } from '@/shared/types/user.types';

const FIRESTORE_BATCH_SIZE = 500;

export interface FirestoreUploadFailure {
  id: string;
  label: string;
  message: string;
}

export interface FirestoreUploadEntityResult {
  total: number;
  written: number;
  failed: number;
  failures: FirestoreUploadFailure[];
}

export interface LocalDataFirestoreUploadResult {
  customers: FirestoreUploadEntityResult;
  products: FirestoreUploadEntityResult;
  users: FirestoreUploadEntityResult;
  branches: FirestoreUploadEntityResult;
}

/** Normalize business keys the same way Excel import does. */
export function normalizeCustomerCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeProductSku(sku: string): string {
  return sku.trim().toUpperCase();
}

interface ResolvedCustomerWrite {
  /** IndexedDB primary key (unchanged). */
  localRecordId: string;
  /** Firestore document payload; `id` is the target cloud document id. */
  payload: Customer;
}

interface ResolvedProductWrite {
  localRecordId: string;
  payload: Product;
}

interface ResolvedBranchWrite {
  localRecordId: string;
  payload: CustomerBranch;
}

function preferCustomer(a: Customer, b: Customer): Customer {
  if (a.isDeleted !== b.isDeleted) {
    return a.isDeleted ? b : a;
  }
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt >= b.updatedAt ? a : b;
  }
  return a.id <= b.id ? a : b;
}

function preferProduct(a: Product, b: Product): Product {
  const aDeleted = a.isDeleted === true;
  const bDeleted = b.isDeleted === true;
  if (aDeleted !== bDeleted) {
    return aDeleted ? b : a;
  }
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt >= b.updatedAt ? a : b;
  }
  return a.id <= b.id ? a : b;
}

function buildRemoteCustomerByCode(remotes: Customer[]): Map<string, Customer> {
  const byCode = new Map<string, Customer>();
  for (const remote of remotes) {
    const key = normalizeCustomerCode(remote.code);
    if (!key) continue;
    const existing = byCode.get(key);
    byCode.set(key, existing ? preferCustomer(existing, remote) : remote);
  }
  return byCode;
}

function buildRemoteProductBySku(remotes: Product[]): Map<string, Product> {
  const bySku = new Map<string, Product>();
  for (const remote of remotes) {
    const key = normalizeProductSku(remote.sku);
    if (!key) continue;
    const existing = bySku.get(key);
    bySku.set(key, existing ? preferProduct(existing, remote) : remote);
  }
  return bySku;
}

function dedupeLocalsByCustomerCode(locals: Customer[]): Customer[] {
  const byCode = new Map<string, Customer>();
  for (const local of locals) {
    const key = normalizeCustomerCode(local.code);
    if (!key) continue;
    const existing = byCode.get(key);
    byCode.set(key, existing ? preferCustomer(existing, local) : local);
  }
  return [...byCode.values()];
}

function dedupeLocalsByProductSku(locals: Product[]): Product[] {
  const bySku = new Map<string, Product>();
  for (const local of locals) {
    const key = normalizeProductSku(local.sku);
    if (!key) continue;
    const existing = bySku.get(key);
    bySku.set(key, existing ? preferProduct(existing, local) : local);
  }
  return [...bySku.values()];
}

/**
 * Resolve each local customer to a Firestore target document id by business key
 * (`code`). Existing remote id → UPDATE; missing → CREATE with local id.
 * Firestore document id scheme stays UUID (Solution A).
 */
export function resolveCustomersForUpload(
  locals: Customer[],
  remotes: Customer[],
): { writes: ResolvedCustomerWrite[]; skipped: FirestoreUploadFailure[] } {
  const remoteByCode = buildRemoteCustomerByCode(remotes);
  const writes: ResolvedCustomerWrite[] = [];
  const skipped: FirestoreUploadFailure[] = [];

  for (const local of locals) {
    if (!normalizeCustomerCode(local.code)) {
      skipped.push({
        id: local.id,
        label: local.code || local.id,
        message: 'Cari kodu boş olduğu için yüklenmedi.',
      });
    }
  }

  for (const local of dedupeLocalsByCustomerCode(locals)) {
    const key = normalizeCustomerCode(local.code);
    const remote = remoteByCode.get(key);
    const targetId = remote?.id ?? local.id;
    writes.push({
      localRecordId: local.id,
      payload: {
        ...local,
        code: key,
        id: targetId,
      },
    });
  }

  return { writes, skipped };
}

/**
 * Resolve each local product to a Firestore target document id by business key
 * (`sku` / PRODUCERCODE). Existing remote id → UPDATE; missing → CREATE.
 */
export function resolveProductsForUpload(
  locals: Product[],
  remotes: Product[],
): { writes: ResolvedProductWrite[]; skipped: FirestoreUploadFailure[] } {
  const remoteBySku = buildRemoteProductBySku(remotes);
  const writes: ResolvedProductWrite[] = [];
  const skipped: FirestoreUploadFailure[] = [];

  for (const local of locals) {
    if (!normalizeProductSku(local.sku)) {
      skipped.push({
        id: local.id,
        label: local.sku || local.id,
        message: 'Ürün kodu (SKU) boş olduğu için yüklenmedi.',
      });
    }
  }

  for (const local of dedupeLocalsByProductSku(locals)) {
    const key = normalizeProductSku(local.sku);
    const remote = remoteBySku.get(key);
    const targetId = remote?.id ?? local.id;
    writes.push({
      localRecordId: local.id,
      payload: {
        ...local,
        sku: key,
        id: targetId,
      },
    });
  }

  return { writes, skipped };
}

/**
 * Remap branch.customerId when the parent customer was uploaded under a
 * different Firestore document id (business-key merge).
 */
export function resolveBranchesForUpload(
  locals: CustomerBranch[],
  customerIdMap: Map<string, string>,
): { writes: ResolvedBranchWrite[]; skipped: FirestoreUploadFailure[] } {
  const writes: ResolvedBranchWrite[] = [];
  const skipped: FirestoreUploadFailure[] = [];

  for (const local of locals) {
    if (!local.customerId.trim()) {
      skipped.push({
        id: local.id,
        label: local.name || local.id,
        message: 'Şube müşteri kimliği boş olduğu için yüklenmedi.',
      });
      continue;
    }

    const targetCustomerId =
      customerIdMap.get(local.customerId) ?? local.customerId;

    writes.push({
      localRecordId: local.id,
      payload: {
        ...local,
        customerId: targetCustomerId,
      },
    });
  }

  return { writes, skipped };
}

async function commitCustomerChunk(
  chunk: ResolvedCustomerWrite[],
): Promise<FirestoreUploadFailure[]> {
  const db = getFirestoreDb();
  if (!db) {
    return chunk.map((write) => ({
      id: write.localRecordId,
      label: write.payload.code,
      message: 'Firestore bağlantısı kurulamadı.',
    }));
  }

  const batch = writeBatch(db);
  for (const write of chunk) {
    batch.set(
      doc(db, 'customers', write.payload.id).withConverter(customerConverter),
      write.payload,
    );
  }

  try {
    await batch.commit();
    return [];
  } catch (batchError) {
    console.error('[Upload] Firestore cari batch hatası:', batchError);

    const failures: FirestoreUploadFailure[] = [];
    for (const write of chunk) {
      try {
        await setDoc(
          doc(db, 'customers', write.payload.id).withConverter(
            customerConverter,
          ),
          write.payload,
        );
      } catch (error) {
        failures.push({
          id: write.localRecordId,
          label: write.payload.code,
          message: getFirestoreErrorMessage(error),
        });
      }
    }
    return failures;
  }
}

async function commitProductChunk(
  chunk: ResolvedProductWrite[],
): Promise<FirestoreUploadFailure[]> {
  const db = getFirestoreDb();
  if (!db) {
    return chunk.map((write) => ({
      id: write.localRecordId,
      label: write.payload.sku,
      message: 'Firestore bağlantısı kurulamadı.',
    }));
  }

  const batch = writeBatch(db);
  for (const write of chunk) {
    batch.set(
      doc(db, 'products', write.payload.id).withConverter(productConverter),
      write.payload,
    );
  }

  try {
    await batch.commit();
    return [];
  } catch (batchError) {
    console.error('[Upload] Firestore stok batch hatası:', batchError);

    const failures: FirestoreUploadFailure[] = [];
    for (const write of chunk) {
      try {
        await setDoc(
          doc(db, 'products', write.payload.id).withConverter(productConverter),
          write.payload,
        );
      } catch (error) {
        failures.push({
          id: write.localRecordId,
          label: write.payload.sku,
          message: getFirestoreErrorMessage(error),
        });
      }
    }
    return failures;
  }
}

async function markCustomersSynced(localRecordIds: string[]): Promise<void> {
  if (localRecordIds.length === 0) return;
  const now = new Date().toISOString();
  const all = await customerLocalRepository.getAll();
  const idSet = new Set(localRecordIds);
  const toSave = all
    .filter((customer) => idSet.has(customer.id))
    .map((customer) => ({
      ...customer,
      syncStatus: 'synced' as const,
      updatedAt: now,
    }));
  if (toSave.length > 0) {
    await customerLocalRepository.saveMany(toSave);
  }
}

async function markProductsSynced(localRecordIds: string[]): Promise<void> {
  if (localRecordIds.length === 0) return;
  const now = new Date().toISOString();
  const all = await productLocalRepository.getAll();
  const idSet = new Set(localRecordIds);
  const toSave = all
    .filter((product) => idSet.has(product.id))
    .map((product) => ({
      ...product,
      syncStatus: 'synced' as const,
      updatedAt: now,
    }));
  if (toSave.length > 0) {
    await productLocalRepository.saveMany(toSave);
  }
}

async function markBranchesSynced(localRecordIds: string[]): Promise<void> {
  if (localRecordIds.length === 0) return;
  const now = new Date().toISOString();
  const all = await branchLocalRepository.getAll();
  const idSet = new Set(localRecordIds);
  const toSave = all
    .filter((branch) => idSet.has(branch.id))
    .map((branch) => ({
      ...branch,
      syncStatus: 'synced' as const,
      updatedAt: now,
    }));
  if (toSave.length > 0) {
    await branchLocalRepository.saveMany(toSave);
  }
}

async function commitBranchChunk(
  chunk: ResolvedBranchWrite[],
): Promise<FirestoreUploadFailure[]> {
  const db = getFirestoreDb();
  if (!db) {
    return chunk.map((write) => ({
      id: write.localRecordId,
      label: write.payload.name,
      message: 'Firestore bağlantısı kurulamadı.',
    }));
  }

  const batch = writeBatch(db);
  for (const write of chunk) {
    batch.set(
      doc(
        db,
        'customers',
        write.payload.customerId,
        'branches',
        write.payload.id,
      ).withConverter(branchConverter),
      write.payload,
    );
  }

  try {
    await batch.commit();
    return [];
  } catch (batchError) {
    console.error('[Upload] Firestore şube batch hatası:', batchError);

    const failures: FirestoreUploadFailure[] = [];
    for (const write of chunk) {
      try {
        await setDoc(
          doc(
            db,
            'customers',
            write.payload.customerId,
            'branches',
            write.payload.id,
          ).withConverter(branchConverter),
          write.payload,
        );
      } catch (error) {
        failures.push({
          id: write.localRecordId,
          label: write.payload.name,
          message: getFirestoreErrorMessage(error),
        });
      }
    }
    return failures;
  }
}

async function uploadCustomers(
  customers: Customer[],
  remotes: Customer[],
): Promise<FirestoreUploadEntityResult> {
  const { writes, skipped } = resolveCustomersForUpload(customers, remotes);
  const failures: FirestoreUploadFailure[] = [...skipped];
  const writtenLocalIds: string[] = [];

  for (let index = 0; index < writes.length; index += FIRESTORE_BATCH_SIZE) {
    const chunk = writes.slice(index, index + FIRESTORE_BATCH_SIZE);
    const chunkFailures = await commitCustomerChunk(chunk);
    failures.push(...chunkFailures);
    const failedIds = new Set(chunkFailures.map((failure) => failure.id));
    writtenLocalIds.push(
      ...chunk
        .filter((write) => !failedIds.has(write.localRecordId))
        .map((write) => write.localRecordId),
    );
  }

  await markCustomersSynced(writtenLocalIds);

  return {
    total: customers.length,
    written: writtenLocalIds.length,
    failed: failures.length,
    failures,
  };
}

async function uploadProducts(
  products: Product[],
  remotes: Product[],
): Promise<FirestoreUploadEntityResult> {
  const { writes, skipped } = resolveProductsForUpload(products, remotes);
  const failures: FirestoreUploadFailure[] = [...skipped];
  const writtenLocalIds: string[] = [];

  for (let index = 0; index < writes.length; index += FIRESTORE_BATCH_SIZE) {
    const chunk = writes.slice(index, index + FIRESTORE_BATCH_SIZE);
    const chunkFailures = await commitProductChunk(chunk);
    failures.push(...chunkFailures);
    const failedIds = new Set(chunkFailures.map((failure) => failure.id));
    writtenLocalIds.push(
      ...chunk
        .filter((write) => !failedIds.has(write.localRecordId))
        .map((write) => write.localRecordId),
    );
  }

  await markProductsSynced(writtenLocalIds);

  return {
    total: products.length,
    written: writtenLocalIds.length,
    failed: failures.length,
    failures,
  };
}

async function uploadBranches(
  branches: CustomerBranch[],
  customerIdMap: Map<string, string>,
): Promise<FirestoreUploadEntityResult> {
  const { writes, skipped } = resolveBranchesForUpload(branches, customerIdMap);
  const failures: FirestoreUploadFailure[] = [...skipped];
  const writtenLocalIds: string[] = [];

  for (let index = 0; index < writes.length; index += FIRESTORE_BATCH_SIZE) {
    const chunk = writes.slice(index, index + FIRESTORE_BATCH_SIZE);
    const chunkFailures = await commitBranchChunk(chunk);
    failures.push(...chunkFailures);
    const failedIds = new Set(chunkFailures.map((failure) => failure.id));
    writtenLocalIds.push(
      ...chunk
        .filter((write) => !failedIds.has(write.localRecordId))
        .map((write) => write.localRecordId),
    );
  }

  await markBranchesSynced(writtenLocalIds);

  return {
    total: branches.length,
    written: writtenLocalIds.length,
    failed: failures.length,
    failures,
  };
}

async function uploadUsers(users: AppUser[]): Promise<FirestoreUploadEntityResult> {
  const failures: FirestoreUploadFailure[] = [];
  const written: AppUser[] = [];

  for (const user of users) {
    try {
      const synced = await upsertUserToFirestore(user);
      written.push(synced);
      await userLocalRepository.upsert(synced);
    } catch (error) {
      failures.push({
        id: user.id,
        label: user.userCode,
        message: getFirestoreErrorMessage(error),
      });
    }
  }

  return {
    total: users.length,
    written: written.length,
    failed: failures.length,
    failures,
  };
}

class LocalDataFirestoreUploadService {
  async uploadAllFromIndexedDb(): Promise<LocalDataFirestoreUploadResult> {
    if (!navigator.onLine) {
      throw new Error('Bu işlem için internet bağlantısı gerekir.');
    }

    if (!isFirebaseConfigured()) {
      throw new Error('Firebase yapılandırması eksik.');
    }

    const [customers, products, users, branches, remoteCustomers, remoteProducts] =
      await Promise.all([
        customerLocalRepository.getAll(),
        productLocalRepository.getAll(),
        userLocalRepository.findAll(),
        branchLocalRepository.getAll(),
        pullAllCustomers(),
        pullAllProducts(),
      ]);

    const customerWrites = resolveCustomersForUpload(customers, remoteCustomers);
    const customerIdMap = new Map(
      customerWrites.writes.map((write) => [
        write.localRecordId,
        write.payload.id,
      ]),
    );

    const customerResult = await uploadCustomers(customers, remoteCustomers);
    const productResult = await uploadProducts(products, remoteProducts);
    const branchResult = await uploadBranches(branches, customerIdMap);
    const userResult = await uploadUsers(users);

    return {
      customers: customerResult,
      products: productResult,
      users: userResult,
      branches: branchResult,
    };
  }
}

export const localDataFirestoreUploadService =
  new LocalDataFirestoreUploadService();
