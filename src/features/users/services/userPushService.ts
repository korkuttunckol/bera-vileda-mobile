import { isFirebaseConfigured } from '@/config/env';
import { userLocalRepository } from '@/shared/lib/indexeddb/repositories/userRepository';
import { upsertUserToFirestore } from '@/shared/lib/firebase/userFirestoreService';
import { getFirestoreErrorMessage } from '@/shared/lib/firebase/firestoreUtils';
import type { AppUser } from '@/shared/types/user.types';

export interface UserPushStats {
  total: number;
  synced: number;
  failed: number;
  errors: Array<{ userCode: string; message: string }>;
}

/**
 * Push local pending users to Firestore by business key (userCode).
 * Called from SyncEngine before pull so pending edits are not overwritten.
 */
export async function pushPendingUsers(): Promise<UserPushStats> {
  const stats: UserPushStats = {
    total: 0,
    synced: 0,
    failed: 0,
    errors: [],
  };

  if (!navigator.onLine || !isFirebaseConfigured()) {
    return stats;
  }

  const pending = await userLocalRepository.findBySyncStatus('pending');
  const failed = await userLocalRepository.findBySyncStatus('failed');
  const queue = [...pending, ...failed];
  stats.total = queue.length;

  if (queue.length === 0) {
    return stats;
  }

  console.info(`[Sync] USER PUSH START (${String(queue.length)} kayıt)`);

  for (const user of queue) {
    try {
      const synced = await upsertUserToFirestore(user);
      await userLocalRepository.upsert(synced);
      stats.synced += 1;
    } catch (error) {
      stats.failed += 1;
      const message = getFirestoreErrorMessage(error);
      stats.errors.push({ userCode: user.userCode, message });
      const marked: AppUser = {
        ...user,
        syncStatus: 'failed',
        updatedAt: new Date().toISOString(),
      };
      await userLocalRepository.upsert(marked);
      console.error('[Sync] USER PUSH failed:', user.userCode, error);
    }
  }

  console.info(
    `[Sync] USER PUSH END · synced=${String(stats.synced)} failed=${String(stats.failed)}`,
  );

  return stats;
}
