import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from './firestore';
import {
  assertOnlineForFirestoreWrite,
  getFirestoreErrorMessage,
  logFirestoreError,
} from './firestoreUtils';
import { omitUndefinedDeep } from './converters';
import {
  normalizeAppUser,
  normalizeUserCode,
  type AppUser,
} from '@/shared/types/user.types';
import { parseUserRole } from '@/shared/types/role.types';

const USERS_COLLECTION = 'users';

function timestampToIso(value: Timestamp | string | undefined): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function mapFirestoreUser(id: string, data: Record<string, unknown>): AppUser | null {
  const role = parseUserRole(data.role);
  if (!role) return null;

  return normalizeAppUser({
    id,
    userCode: readString(data.userCode, id),
    passwordHash: readString(data.passwordHash),
    name: readString(data.name),
    role,
    active: data.active !== false,
    phone: readString(data.phone) || undefined,
    email: readString(data.email) || undefined,
    description: readString(data.description) || undefined,
    isDeleted: data.isDeleted === true,
    deletedAt: data.deletedAt
      ? timestampToIso(data.deletedAt as Timestamp | string)
      : undefined,
    syncStatus: 'synced',
    createdAt: timestampToIso(data.createdAt as Timestamp | string | undefined),
    updatedAt: timestampToIso(data.updatedAt as Timestamp | string | undefined),
  });
}

function toFirestorePayload(user: AppUser): Record<string, unknown> {
  return omitUndefinedDeep({
    userCode: user.userCode,
    passwordHash: user.passwordHash,
    name: user.name,
    role: user.role,
    active: user.active,
    phone: user.phone,
    email: user.email,
    description: user.description,
    isDeleted: user.isDeleted,
    deletedAt: user.deletedAt
      ? Timestamp.fromDate(new Date(user.deletedAt))
      : null,
    createdAt: Timestamp.fromDate(new Date(user.createdAt)),
    updatedAt: Timestamp.fromDate(new Date(user.updatedAt)),
  });
}

export async function fetchUserByCodeFromFirestore(
  userCode: string,
): Promise<AppUser | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const normalizedCode = normalizeUserCode(userCode);
    const snapshot = await getDoc(doc(db, USERS_COLLECTION, normalizedCode));
    if (!snapshot.exists()) return null;
    return mapFirestoreUser(snapshot.id, snapshot.data());
  } catch (error) {
    logFirestoreError('Kullanıcı okuma hatası', error);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

export async function fetchAllUsersFromFirestore(): Promise<AppUser[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  console.info('[Firestore] getDocs users (tüm koleksiyon) başladı');
  const startedAt = Date.now();

  try {
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users: AppUser[] = [];

    snapshot.forEach((item) => {
      const mapped = mapFirestoreUser(item.id, item.data());
      if (mapped) users.push(mapped);
    });

    console.info(
      `[Firestore] getDocs users bitti (${String(Date.now() - startedAt)} ms, ${String(users.length)} kayıt)`,
    );
    return users.sort((a, b) => a.userCode.localeCompare(b.userCode, 'tr-TR'));
  } catch (error) {
    console.error(
      `[Firestore] getDocs users hata (${String(Date.now() - startedAt)} ms):`,
      error,
    );
    logFirestoreError('Kullanıcı listesi okuma hatası', error);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

/**
 * Upsert by business key (`userCode` = Firestore document id).
 * Same key always updates the same document — no UUID duplicates.
 */
export async function upsertUserToFirestore(user: AppUser): Promise<AppUser> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore bağlantısı kurulamadı.');
  }

  assertOnlineForFirestoreWrite();

  const normalized = normalizeAppUser(user);
  const ref = doc(db, USERS_COLLECTION, normalized.userCode);

  try {
    await setDoc(ref, toFirestorePayload(normalized));
  } catch (error) {
    logFirestoreError('Kullanıcı yazma hatası', error);
    throw new Error(getFirestoreErrorMessage(error));
  }

  return {
    ...normalized,
    syncStatus: 'synced',
  };
}
