import {
  doc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { isFirebaseConfigured } from '@/config/env';
import { getFirestoreDb } from '@/shared/lib/firebase/firestore';
import {
  customerConverter,
  productConverter,
} from '@/shared/lib/firebase/converters';
import { getFirestoreErrorMessage } from '@/shared/lib/firebase/firestoreUtils';
import type { Customer } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';

const FIRESTORE_BATCH_SIZE = 500;

export interface ImportFirestorePushFailure {
  entityId: string;
  message: string;
}

export interface ImportFirestorePushResult {
  attempted: number;
  synced: number;
  failed: ImportFirestorePushFailure[];
  skipped: number;
}

function canPushToFirestore(): boolean {
  return isFirebaseConfigured() && navigator.onLine;
}

async function commitBatchWithFallback<T extends { id: string }>(
  items: T[],
  writeItem: (
    batch: ReturnType<typeof writeBatch>,
    item: T,
  ) => void,
  writeSingle: (item: T) => Promise<void>,
): Promise<ImportFirestorePushFailure[]> {
  const db = getFirestoreDb();
  if (!db) {
    return items.map((item) => ({
      entityId: item.id,
      message: 'Firestore bağlantısı kurulamadı.',
    }));
  }

  const failures: ImportFirestorePushFailure[] = [];
  const batch = writeBatch(db);

  for (const item of items) {
    writeItem(batch, item);
  }

  try {
    await batch.commit();
    return failures;
  } catch (batchError) {
    console.error('[Import] Firestore batch commit hatası:', batchError);

    for (const item of items) {
      try {
        await writeSingle(item);
      } catch (error) {
        failures.push({
          entityId: item.id,
          message: getFirestoreErrorMessage(error),
        });
      }
    }

    return failures;
  }
}

async function pushEntitiesInBatches<T extends { id: string }>(
  items: T[],
  writeItem: (
    batch: ReturnType<typeof writeBatch>,
    item: T,
  ) => void,
  writeSingle: (item: T) => Promise<void>,
): Promise<ImportFirestorePushFailure[]> {
  const failures: ImportFirestorePushFailure[] = [];

  for (let index = 0; index < items.length; index += FIRESTORE_BATCH_SIZE) {
    const chunk = items.slice(index, index + FIRESTORE_BATCH_SIZE);
    const chunkFailures = await commitBatchWithFallback(
      chunk,
      writeItem,
      writeSingle,
    );
    failures.push(...chunkFailures);
  }

  return failures;
}

export async function pushImportedCustomersToFirestore(
  customers: Customer[],
): Promise<ImportFirestorePushResult> {
  if (customers.length === 0) {
    return { attempted: 0, synced: 0, failed: [], skipped: 0 };
  }

  if (!canPushToFirestore()) {
    return {
      attempted: customers.length,
      synced: 0,
      failed: [],
      skipped: customers.length,
    };
  }

  const db = getFirestoreDb();
  if (!db) {
    return {
      attempted: customers.length,
      synced: 0,
      failed: customers.map((customer) => ({
        entityId: customer.id,
        message: 'Firestore bağlantısı kurulamadı.',
      })),
      skipped: 0,
    };
  }

  const failures = await pushEntitiesInBatches(
    customers,
    (batch, customer) => {
      batch.set(
        doc(db, 'customers', customer.id).withConverter(customerConverter),
        customer,
      );
    },
    async (customer) => {
      await setDoc(
        doc(db, 'customers', customer.id).withConverter(customerConverter),
        customer,
      );
    },
  );

  return {
    attempted: customers.length,
    synced: customers.length - failures.length,
    failed: failures,
    skipped: 0,
  };
}

export async function pushImportedProductsToFirestore(
  products: Product[],
): Promise<ImportFirestorePushResult> {
  if (products.length === 0) {
    return { attempted: 0, synced: 0, failed: [], skipped: 0 };
  }

  if (!canPushToFirestore()) {
    return {
      attempted: products.length,
      synced: 0,
      failed: [],
      skipped: products.length,
    };
  }

  const db = getFirestoreDb();
  if (!db) {
    return {
      attempted: products.length,
      synced: 0,
      failed: products.map((product) => ({
        entityId: product.id,
        message: 'Firestore bağlantısı kurulamadı.',
      })),
      skipped: 0,
    };
  }

  const failures = await pushEntitiesInBatches(
    products,
    (batch, product) => {
      batch.set(
        doc(db, 'products', product.id).withConverter(productConverter),
        product,
      );
    },
    async (product) => {
      await setDoc(
        doc(db, 'products', product.id).withConverter(productConverter),
        product,
      );
    },
  );

  return {
    attempted: products.length,
    synced: products.length - failures.length,
    failed: failures,
    skipped: 0,
  };
}
