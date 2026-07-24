import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from './firestore';
import {
  assertOnlineForFirestoreWrite,
  ensureFirestoreOnline,
  getFirestoreErrorMessage,
  withFirestoreTimeout,
} from './firestoreUtils';
import { hashPassword } from '@/shared/lib/crypto/passwordService';
import {
  normalizeUserCode,
  type AppUser,
  type CreateUserInput,
  type UpdateUserInput,
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

  return {
    id,
    userCode: readString(data.userCode, id),
    passwordHash: readString(data.passwordHash),
    name: readString(data.name),
    role,
    active: data.active !== false,
    createdAt: timestampToIso(data.createdAt as Timestamp | string | undefined),
    updatedAt: timestampToIso(data.updatedAt as Timestamp | string | undefined),
  };
}

async function runFirestoreWrite<T>(operation: () => Promise<T>): Promise<T> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore bağlantısı kurulamadı.');
  }

  assertOnlineForFirestoreWrite();
  await ensureFirestoreOnline(db);

  try {
    return await withFirestoreTimeout(operation());
  } catch (error) {
    console.error('[Firestore] Kullanıcı işlemi başarısız:', error);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

export async function fetchUserByCodeFromFirestore(
  userCode: string,
): Promise<AppUser | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const normalizedCode = normalizeUserCode(userCode);
    const snapshot = await withFirestoreTimeout(
      getDoc(doc(db, USERS_COLLECTION, normalizedCode)),
    );
    if (!snapshot.exists()) return null;
    return mapFirestoreUser(snapshot.id, snapshot.data());
  } catch (error) {
    console.error('[Firestore] Kullanıcı okuma hatası:', error);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

export async function fetchAllUsersFromFirestore(): Promise<AppUser[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await withFirestoreTimeout(getDocs(collection(db, USERS_COLLECTION)));
    const users: AppUser[] = [];

    snapshot.forEach((item) => {
      const mapped = mapFirestoreUser(item.id, item.data());
      if (mapped) users.push(mapped);
    });

    return users.sort((a, b) => a.userCode.localeCompare(b.userCode, 'tr-TR'));
  } catch (error) {
    console.error('[Firestore] Kullanıcı listesi okuma hatası:', error);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

export async function createUserInFirestore(input: CreateUserInput): Promise<AppUser> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore bağlantısı kurulamadı.');
  }

  const userCode = normalizeUserCode(input.userCode);
  const existing = await fetchUserByCodeFromFirestore(userCode);
  if (existing) {
    throw new Error('Bu kullanıcı kodu Firestore üzerinde zaten kayıtlı.');
  }

  const now = Timestamp.now();
  const passwordHash = await hashPassword(input.password);

  const user: AppUser = {
    id: userCode,
    userCode,
    passwordHash,
    name: input.name.trim(),
    role: input.role,
    active: input.active ?? true,
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  };

  await runFirestoreWrite(async () => {
    await setDoc(doc(db, USERS_COLLECTION, userCode), {
      userCode,
      passwordHash,
      name: user.name,
      role: user.role,
      active: user.active,
      createdAt: now,
      updatedAt: now,
    });
  });

  return user;
}

export async function updateUserInFirestore(
  userCode: string,
  input: UpdateUserInput,
): Promise<AppUser> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore bağlantısı kurulamadı.');
  }

  const normalizedCode = normalizeUserCode(userCode);
  const ref = doc(db, USERS_COLLECTION, normalizedCode);

  const existing = await withFirestoreTimeout(getDoc(ref));
  if (!existing.exists()) {
    throw new Error('Kullanıcı bulunamadı.');
  }

  const current = mapFirestoreUser(existing.id, existing.data());
  if (!current) {
    throw new Error('Kullanıcı verisi okunamadı.');
  }

  const now = Timestamp.now();
  const nextPasswordHash = input.password
    ? await hashPassword(input.password)
    : current.passwordHash;

  const updated: AppUser = {
    ...current,
    name: input.name?.trim() ?? current.name,
    role: input.role ?? current.role,
    active: input.active ?? current.active,
    passwordHash: nextPasswordHash,
    updatedAt: now.toDate().toISOString(),
  };

  await runFirestoreWrite(async () => {
    await setDoc(ref, {
      userCode: updated.userCode,
      passwordHash: updated.passwordHash,
      name: updated.name,
      role: updated.role,
      active: updated.active,
      createdAt: Timestamp.fromDate(new Date(current.createdAt)),
      updatedAt: now,
    });
  });

  return updated;
}

export async function deleteUserFromFirestore(userCode: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore bağlantısı kurulamadı.');
  }

  await runFirestoreWrite(async () => {
    await deleteDoc(doc(db, USERS_COLLECTION, normalizeUserCode(userCode)));
  });
}
