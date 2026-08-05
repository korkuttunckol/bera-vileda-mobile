import {
  doc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { isFirebaseConfigured } from '@/config/env';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import { getFirestoreDb } from '@/shared/lib/firebase/firestore';
import {
  customerConverter,
  productConverter,
} from '@/shared/lib/firebase/converters';
import { getFirestoreErrorMessage } from '@/shared/lib/firebase/firestoreUtils';
import type { Customer } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';

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
}

async function commitCustomerChunk(
  chunk: Customer[],
): Promise<FirestoreUploadFailure[]> {
  const db = getFirestoreDb();
  if (!db) {
    return chunk.map((customer) => ({
      id: customer.id,
      label: customer.code,
      message: 'Firestore bağlantısı kurulamadı.',
    }));
  }

  const batch = writeBatch(db);
  for (const customer of chunk) {
    batch.set(
      doc(db, 'customers', customer.id).withConverter(customerConverter),
      customer,
    );
  }

  try {
    await batch.commit();
    return [];
  } catch (batchError) {
    console.error('[Upload] Firestore cari batch hatası:', batchError);

    const failures: FirestoreUploadFailure[] = [];
    for (const customer of chunk) {
      try {
        await setDoc(
          doc(db, 'customers', customer.id).withConverter(customerConverter),
          customer,
        );
      } catch (error) {
        failures.push({
          id: customer.id,
          label: customer.code,
          message: getFirestoreErrorMessage(error),
        });
      }
    }
    return failures;
  }
}

async function commitProductChunk(
  chunk: Product[],
): Promise<FirestoreUploadFailure[]> {
  const db = getFirestoreDb();
  if (!db) {
    return chunk.map((product) => ({
      id: product.id,
      label: product.sku,
      message: 'Firestore bağlantısı kurulamadı.',
    }));
  }

  const batch = writeBatch(db);
  for (const product of chunk) {
    batch.set(
      doc(db, 'products', product.id).withConverter(productConverter),
      product,
    );
  }

  try {
    await batch.commit();
    return [];
  } catch (batchError) {
    console.error('[Upload] Firestore stok batch hatası:', batchError);

    const failures: FirestoreUploadFailure[] = [];
    for (const product of chunk) {
      try {
        await setDoc(
          doc(db, 'products', product.id).withConverter(productConverter),
          product,
        );
      } catch (error) {
        failures.push({
          id: product.id,
          label: product.sku,
          message: getFirestoreErrorMessage(error),
        });
      }
    }
    return failures;
  }
}

async function markCustomersSynced(customers: Customer[]): Promise<void> {
  if (customers.length === 0) return;
  const now = new Date().toISOString();
  await customerLocalRepository.saveMany(
    customers.map((customer) => ({
      ...customer,
      syncStatus: 'synced' as const,
      updatedAt: now,
    })),
  );
}

async function markProductsSynced(products: Product[]): Promise<void> {
  if (products.length === 0) return;
  const now = new Date().toISOString();
  await productLocalRepository.saveMany(
    products.map((product) => ({
      ...product,
      syncStatus: 'synced' as const,
      updatedAt: now,
    })),
  );
}

async function uploadCustomers(
  customers: Customer[],
): Promise<FirestoreUploadEntityResult> {
  const failures: FirestoreUploadFailure[] = [];
  const writtenCustomers: Customer[] = [];

  for (let index = 0; index < customers.length; index += FIRESTORE_BATCH_SIZE) {
    const chunk = customers.slice(index, index + FIRESTORE_BATCH_SIZE);
    const chunkFailures = await commitCustomerChunk(chunk);
    failures.push(...chunkFailures);
    const failedIds = new Set(chunkFailures.map((failure) => failure.id));
    writtenCustomers.push(
      ...chunk.filter((customer) => !failedIds.has(customer.id)),
    );
  }

  await markCustomersSynced(writtenCustomers);

  return {
    total: customers.length,
    written: writtenCustomers.length,
    failed: failures.length,
    failures,
  };
}

async function uploadProducts(
  products: Product[],
): Promise<FirestoreUploadEntityResult> {
  const failures: FirestoreUploadFailure[] = [];
  const writtenProducts: Product[] = [];

  for (let index = 0; index < products.length; index += FIRESTORE_BATCH_SIZE) {
    const chunk = products.slice(index, index + FIRESTORE_BATCH_SIZE);
    const chunkFailures = await commitProductChunk(chunk);
    failures.push(...chunkFailures);
    const failedIds = new Set(chunkFailures.map((failure) => failure.id));
    writtenProducts.push(
      ...chunk.filter((product) => !failedIds.has(product.id)),
    );
  }

  await markProductsSynced(writtenProducts);

  return {
    total: products.length,
    written: writtenProducts.length,
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

    const [customers, products] = await Promise.all([
      customerLocalRepository.getAll(),
      productLocalRepository.getAll(),
    ]);

    const customerResult = await uploadCustomers(customers);
    const productResult = await uploadProducts(products);

    return {
      customers: customerResult,
      products: productResult,
    };
  }
}

export const localDataFirestoreUploadService =
  new LocalDataFirestoreUploadService();
