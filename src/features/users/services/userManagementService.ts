import { isFirebaseConfigured } from '@/config/env';
import {
  filterUsers,
  userLocalRepository,
} from '@/shared/lib/indexeddb/repositories/userRepository';
import { hashPassword } from '@/shared/lib/crypto/passwordService';
import { upsertUserToFirestore } from '@/shared/lib/firebase/userFirestoreService';
import { getFirestoreErrorMessage } from '@/shared/lib/firebase/firestoreUtils';
import { syncService } from '@/features/sync/services/syncService';
import { UserRole } from '@/shared/types/role.types';
import {
  normalizeAppUser,
  normalizeUserCode,
  toPublicUser,
  type AppUser,
  type AppUserPublic,
  type CreateUserInput,
  type UpdateUserInput,
  type UserActiveFilter,
  type UserRoleFilter,
} from '@/shared/types/user.types';
import {
  assertCanChangeRoleFromAdmin,
  assertCanDeactivateUser,
  assertCanDeleteUser,
} from './userAdminGuards';

async function flushUserToFirestore(user: AppUser): Promise<AppUser> {
  if (!navigator.onLine || !isFirebaseConfigured()) {
    return user;
  }

  try {
    const synced = await upsertUserToFirestore(user);
    await userLocalRepository.upsert(synced);
    return synced;
  } catch (error) {
    console.error('[UserManagement] Firestore flush failed:', error);
    const failed = normalizeAppUser({ ...user, syncStatus: 'failed' });
    await userLocalRepository.upsert(failed);
    throw new Error(getFirestoreErrorMessage(error));
  }
}

class UserManagementService {
  async listUsers(options: {
    activeFilter?: UserActiveFilter;
    roleFilter?: UserRoleFilter;
    search?: string;
  } = {}): Promise<AppUserPublic[]> {
    // Never fall back to in-memory seed users — that caused "deleted" rows to reappear.
    const cached = await userLocalRepository.findAll();
    return filterUsers(cached, options).map(toPublicUser);
  }

  async getByCode(userCode: string): Promise<AppUserPublic | undefined> {
    const user = await userLocalRepository.findByCode(userCode);
    if (!user || user.isDeleted) return undefined;
    return toPublicUser(user);
  }

  async createUser(input: CreateUserInput): Promise<AppUserPublic> {
    const normalizedCode = normalizeUserCode(input.userCode);
    if (!normalizedCode) {
      throw new Error('Kullanıcı adı zorunludur.');
    }
    if (!input.name.trim()) {
      throw new Error('Ad soyad zorunludur.');
    }
    if (!input.password || input.password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır.');
    }

    const existing = await userLocalRepository.findByCode(normalizedCode);
    if (existing && !existing.isDeleted) {
      throw new Error('Bu kullanıcı adı zaten kayıtlı.');
    }

    const now = new Date().toISOString();
    const passwordHash = await hashPassword(input.password);
    const user = normalizeAppUser({
      id: normalizedCode,
      userCode: normalizedCode,
      passwordHash,
      name: input.name.trim(),
      role: input.role,
      active: input.active ?? true,
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      description: input.description?.trim() || undefined,
      isDeleted: false,
      deletedAt: undefined,
      syncStatus: 'pending',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    await userLocalRepository.upsert(user);
    syncService.notifyDataChanged();

    const flushed = await flushUserToFirestore(user);
    syncService.notifyDataChanged();
    return toPublicUser(flushed);
  }

  async updateUser(
    userCode: string,
    input: UpdateUserInput,
  ): Promise<AppUserPublic> {
    const normalizedCode = normalizeUserCode(userCode);
    const existing = await userLocalRepository.findByCode(normalizedCode);
    if (!existing || existing.isDeleted) {
      throw new Error('Kullanıcı bulunamadı.');
    }

    const allUsers = await userLocalRepository.findAll();

    if (input.active === false) {
      assertCanDeactivateUser(existing, allUsers);
    }

    if (input.role !== undefined && input.role !== existing.role) {
      assertCanChangeRoleFromAdmin(existing, input.role, allUsers);
    }

    const now = new Date().toISOString();
    const passwordHash = input.password
      ? await hashPassword(input.password)
      : existing.passwordHash;

    const updated = normalizeAppUser({
      ...existing,
      name: input.name?.trim() ?? existing.name,
      role: input.role ?? existing.role,
      active: input.active ?? existing.active,
      phone:
        input.phone !== undefined
          ? input.phone.trim() || undefined
          : existing.phone,
      email:
        input.email !== undefined
          ? input.email.trim() || undefined
          : existing.email,
      description:
        input.description !== undefined
          ? input.description.trim() || undefined
          : existing.description,
      passwordHash,
      syncStatus: 'pending',
      updatedAt: now,
      isDeleted: false,
      deletedAt: undefined,
    });

    await userLocalRepository.upsert(updated);
    syncService.notifyDataChanged();

    const flushed = await flushUserToFirestore(updated);
    syncService.notifyDataChanged();
    return toPublicUser(flushed);
  }

  async setUserActive(
    userCode: string,
    active: boolean,
  ): Promise<AppUserPublic> {
    return this.updateUser(userCode, { active });
  }

  async changePassword(
    userCode: string,
    password: string,
  ): Promise<AppUserPublic> {
    if (!password || password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır.');
    }
    return this.updateUser(userCode, { password });
  }

  async softDeleteUser(userCode: string): Promise<void> {
    const normalizedCode = normalizeUserCode(userCode);
    const existing = await userLocalRepository.findByCode(normalizedCode);
    if (!existing || existing.isDeleted) {
      throw new Error('Kullanıcı bulunamadı.');
    }

    const allUsers = await userLocalRepository.findAll();
    assertCanDeleteUser(existing, allUsers);

    const now = new Date().toISOString();
    const deleted = normalizeAppUser({
      ...existing,
      isDeleted: true,
      active: false,
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });

    await userLocalRepository.upsert(deleted);
    syncService.notifyDataChanged();

    await flushUserToFirestore(deleted);
    syncService.notifyDataChanged();
  }

  /** @deprecated Use softDeleteUser — kept for callers that still say delete. */
  async deleteUser(userCode: string): Promise<void> {
    await this.softDeleteUser(userCode);
  }

  toFormDefaults(user?: AppUserPublic): {
    userCode: string;
    name: string;
    phone: string;
    email: string;
    description: string;
    role: UserRole;
    active: boolean;
    password: string;
  } {
    return {
      userCode: user?.userCode ?? '',
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
      description: user?.description ?? '',
      role: user?.role ?? UserRole.MERCH,
      active: user?.active ?? true,
      password: '',
    };
  }
}

export const userManagementService = new UserManagementService();
