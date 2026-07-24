import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from './firestore';
import { withFirestoreTimeout, getFirestoreErrorMessage } from './firestoreUtils';
import {
  orderConverter,
  orderLineConverter,
  customerConverter,
  branchConverter,
  productConverter,
} from './converters';
import type { Order, OrderLine } from '@/shared/types/order.types';
import type { Customer, CustomerBranch } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';

export async function pushOrderToFirestore(
  order: Order,
  lines: OrderLine[],
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore bağlantısı kurulamadı.');
  }

  const batch = writeBatch(db);
  const orderRef = doc(db, 'orders', order.id).withConverter(orderConverter);
  batch.set(orderRef, order);

  for (const line of lines) {
    const lineRef = doc(db, 'orders', order.id, 'lines', line.id).withConverter(
      orderLineConverter,
    );
    batch.set(lineRef, line);
  }

  await batch.commit();
}

export async function pushCustomerToFirestore(
  customer: Customer,
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore bağlantısı kurulamadı.');

  await setDoc(
    doc(db, 'customers', customer.id).withConverter(customerConverter),
    customer,
  );
}

export async function pushBranchToFirestore(
  branch: CustomerBranch,
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore bağlantısı kurulamadı.');

  await setDoc(
    doc(db, 'customers', branch.customerId, 'branches', branch.id).withConverter(
      branchConverter,
    ),
    branch,
  );
}

export async function findOrderByLocalId(
  localId: string,
): Promise<Order | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const q = query(
    collection(db, 'orders').withConverter(orderConverter),
    where('localId', '==', localId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs[0]?.data() ?? null;
}

export async function pullCustomersSince(
  since: string,
): Promise<Customer[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const sinceTimestamp = Timestamp.fromDate(new Date(since));
    const q = query(
      collection(db, 'customers').withConverter(customerConverter),
      where('updatedAt', '>', sinceTimestamp),
    );
    const snapshot = await withFirestoreTimeout(getDocs(q));
    return snapshot.docs.map((d) => d.data());
  } catch (error) {
    console.error('[Firestore] Cari çekme hatası:', error);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

export async function pullAllCustomers(): Promise<Customer[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await withFirestoreTimeout(
      getDocs(collection(db, 'customers').withConverter(customerConverter)),
    );
    return snapshot.docs.map((d) => d.data());
  } catch (error) {
    console.error('[Firestore] Tüm cari çekme hatası:', error);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

export async function pullProductsSince(since: string): Promise<Product[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const sinceTimestamp = Timestamp.fromDate(new Date(since));
    const q = query(
      collection(db, 'products').withConverter(productConverter),
      where('updatedAt', '>', sinceTimestamp),
    );
    const snapshot = await withFirestoreTimeout(getDocs(q));
    return snapshot.docs.map((d) => d.data());
  } catch (error) {
    console.error('[Firestore] Stok çekme hatası:', error);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

export async function pullAllProducts(): Promise<Product[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await withFirestoreTimeout(
      getDocs(collection(db, 'products').withConverter(productConverter)),
    );
    return snapshot.docs.map((d) => d.data());
  } catch (error) {
    console.error('[Firestore] Tüm stok çekme hatası:', error);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

export async function saveSyncLog(report: {
  id: string;
  push: { synced: number; failed: number };
  pull: { customers: number; products: number; users: number };
  success: boolean;
  errors: { message: string }[];
  startedAt: string;
  completedAt: string;
}): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  await setDoc(doc(db, 'syncLogs', report.id), {
    ...report,
    syncedAt: report.completedAt,
    entityType: 'sync_report',
    status: report.success ? 'success' : 'failed',
  });
}
