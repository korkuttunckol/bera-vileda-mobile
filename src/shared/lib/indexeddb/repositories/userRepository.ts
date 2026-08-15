import { db } from '@/shared/lib/indexeddb/db';
import {
  normalizeAppUser,
  normalizeUserCode,
  type AppUser,
  type UserActiveFilter,
  type UserRoleFilter,
} from '@/shared/types/user.types';
import type { SyncStatus } from '@/shared/types/base.types';
import { UserRole } from '@/shared/types/role.types';

class UserLocalRepository {
  async upsert(user: AppUser): Promise<void> {
    await db.users.put(normalizeAppUser(user));
  }

  async upsertMany(users: AppUser[]): Promise<void> {
    if (users.length === 0) return;
    await db.users.bulkPut(users.map(normalizeAppUser));
  }

  async findByCode(userCode: string): Promise<AppUser | undefined> {
    const normalized = normalizeUserCode(userCode);
    const user = await db.users.get(normalized);
    return user ? normalizeAppUser(user) : undefined;
  }

  async findAll(): Promise<AppUser[]> {
    const users = await db.users.orderBy('userCode').toArray();
    return users.map(normalizeAppUser);
  }

  async findAllNotDeleted(): Promise<AppUser[]> {
    const users = await this.findAll();
    return users.filter((user) => !user.isDeleted);
  }

  async findBySyncStatus(status: SyncStatus): Promise<AppUser[]> {
    const users = await this.findAll();
    return users.filter((user) => user.syncStatus === status);
  }

  async replaceAll(users: AppUser[]): Promise<void> {
    await db.transaction('rw', db.users, async () => {
      await db.users.clear();
      if (users.length > 0) {
        await db.users.bulkPut(users.map(normalizeAppUser));
      }
    });
  }

  /** Physical remove — reserved for sync cleanup of hard-deleted remotes. */
  async remove(userCode: string): Promise<void> {
    await db.users.delete(normalizeUserCode(userCode));
  }
}

export const userLocalRepository = new UserLocalRepository();

export function filterUsers(
  users: AppUser[],
  options: {
    activeFilter?: UserActiveFilter;
    roleFilter?: UserRoleFilter;
    includeDeleted?: boolean;
    search?: string;
  } = {},
): AppUser[] {
  let result = options.includeDeleted
    ? [...users]
    : users.filter((user) => !user.isDeleted);

  if (options.activeFilter === 'active') {
    result = result.filter((user) => user.active);
  } else if (options.activeFilter === 'passive') {
    result = result.filter((user) => !user.active);
  }

  if (options.roleFilter === 'admin') {
    result = result.filter((user) => user.role === UserRole.ADMIN);
  } else if (options.roleFilter === 'salesRep') {
    result = result.filter((user) => user.role === UserRole.SALES_REP);
  } else if (options.roleFilter === 'merch') {
    result = result.filter((user) => user.role === UserRole.MERCH);
  }

  if (options.search?.trim()) {
    const term = options.search.trim().toLocaleLowerCase('tr-TR');
    result = result.filter(
      (user) =>
        user.userCode.toLocaleLowerCase('tr-TR').includes(term) ||
        user.name.toLocaleLowerCase('tr-TR').includes(term),
    );
  }

  return result.sort((a, b) =>
    a.userCode.localeCompare(b.userCode, 'tr-TR', { sensitivity: 'base' }),
  );
}
