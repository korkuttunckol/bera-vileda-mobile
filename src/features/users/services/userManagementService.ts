import { isFirebaseConfigured } from '@/config/env';
import {
  createUserInFirestore,
  deleteUserFromFirestore,
  fetchAllUsersFromFirestore,
  updateUserInFirestore,
} from '@/shared/lib/firebase/userFirestoreService';
import { userLocalRepository } from '@/shared/lib/indexeddb/repositories/userRepository';
import {
  normalizeUserCode,
  toPublicUser,
  type AppUserPublic,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/shared/types/user.types';
import { getDevUsers } from '@/features/auth/services/devUsers';

class UserManagementService {
  async listUsers(): Promise<AppUserPublic[]> {
    if (navigator.onLine && isFirebaseConfigured()) {
      const remoteUsers = await fetchAllUsersFromFirestore();
      await userLocalRepository.upsertMany(remoteUsers);
      return remoteUsers.map(toPublicUser);
    }

    const cached = await userLocalRepository.findAll();
    if (cached.length > 0) {
      return cached.map(toPublicUser);
    }

    const devUsers = await getDevUsers();
    return devUsers.map(toPublicUser);
  }

  async createUser(input: CreateUserInput): Promise<AppUserPublic> {
    const normalizedCode = normalizeUserCode(input.userCode);
    const existing = await userLocalRepository.findByCode(normalizedCode);
    if (existing) {
      throw new Error('Bu kullanıcı kodu zaten kayıtlı.');
    }

    if (isFirebaseConfigured()) {
      const created = await createUserInFirestore(input);
      await userLocalRepository.upsert(created);
      return toPublicUser(created);
    }

    throw new Error('Kullanıcı oluşturmak için Firestore bağlantısı gerekir.');
  }

  async updateUser(userCode: string, input: UpdateUserInput): Promise<AppUserPublic> {
    if (isFirebaseConfigured()) {
      const updated = await updateUserInFirestore(userCode, input);
      await userLocalRepository.upsert(updated);
      return toPublicUser(updated);
    }

    throw new Error('Kullanıcı güncellemek için Firestore bağlantısı gerekir.');
  }

  async setUserActive(userCode: string, active: boolean): Promise<AppUserPublic> {
    return this.updateUser(userCode, { active });
  }

  async deleteUser(userCode: string): Promise<void> {
    if (isFirebaseConfigured()) {
      await deleteUserFromFirestore(userCode);
    }
    await userLocalRepository.remove(userCode);
  }
}

export const userManagementService = new UserManagementService();
