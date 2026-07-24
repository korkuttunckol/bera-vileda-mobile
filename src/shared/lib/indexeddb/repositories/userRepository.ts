import { db } from '@/shared/lib/indexeddb/db';
import type { AppUser } from '@/shared/types/user.types';
import { normalizeUserCode } from '@/shared/types/user.types';

class UserLocalRepository {
  async upsert(user: AppUser): Promise<void> {
    await db.users.put(user);
  }

  async upsertMany(users: AppUser[]): Promise<void> {
    await db.users.bulkPut(users);
  }

  async findByCode(userCode: string): Promise<AppUser | undefined> {
    const normalized = normalizeUserCode(userCode);
    return db.users.get(normalized);
  }

  async findAll(): Promise<AppUser[]> {
    return db.users.orderBy('userCode').toArray();
  }

  async remove(userCode: string): Promise<void> {
    await db.users.delete(normalizeUserCode(userCode));
  }
}

export const userLocalRepository = new UserLocalRepository();
