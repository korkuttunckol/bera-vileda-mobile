import { isFirebaseConfigured } from '@/config/env';
import {
  createUserInFirestore,
  deleteUserFromFirestore,
  fetchAllUsersFromFirestore,
  updateUserInFirestore,
} from '@/shared/lib/firebase/userFirestoreService';
import { getFirestoreErrorMessage } from '@/shared/lib/firebase/firestoreUtils';
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
      try {
        const remoteUsers = await fetchAllUsersFromFirestore();
        await userLocalRepository.upsertMany(remoteUsers);
        return remoteUsers.map(toPublicUser);
      } catch (error) {
        console.error('[UserManagement] Firestore kullanıcı listesi alınamadı:', error);
      }
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

    if (!navigator.onLine) {
      throw new Error('Kullanıcı oluşturmak için internet bağlantısı gerekir.');
    }

    if (!isFirebaseConfigured()) {
      throw new Error('Kullanıcı oluşturmak için Firestore yapılandırması gerekir.');
    }

    const cached = await userLocalRepository.findByCode(normalizedCode);
    if (cached) {
      throw new Error('Bu kullanıcı kodu zaten kayıtlı.');
    }

    try {
      const created = await createUserInFirestore(input);
      await userLocalRepository.upsert(created);
      return toPublicUser(created);
    } catch (error) {
      console.error('[UserManagement] Kullanıcı oluşturma hatası:', error);
      throw new Error(getFirestoreErrorMessage(error));
    }
  }

  async updateUser(userCode: string, input: UpdateUserInput): Promise<AppUserPublic> {
    if (!navigator.onLine) {
      throw new Error('Kullanıcı güncellemek için internet bağlantısı gerekir.');
    }

    if (!isFirebaseConfigured()) {
      throw new Error('Kullanıcı güncellemek için Firestore yapılandırması gerekir.');
    }

    try {
      const updated = await updateUserInFirestore(userCode, input);
      await userLocalRepository.upsert(updated);
      return toPublicUser(updated);
    } catch (error) {
      console.error('[UserManagement] Kullanıcı güncelleme hatası:', error);
      throw new Error(getFirestoreErrorMessage(error));
    }
  }

  async setUserActive(userCode: string, active: boolean): Promise<AppUserPublic> {
    return this.updateUser(userCode, { active });
  }

  async deleteUser(userCode: string): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Kullanıcı silmek için internet bağlantısı gerekir.');
    }

    try {
      if (isFirebaseConfigured()) {
        await deleteUserFromFirestore(userCode);
      }
      await userLocalRepository.remove(userCode);
    } catch (error) {
      console.error('[UserManagement] Kullanıcı silme hatası:', error);
      throw new Error(getFirestoreErrorMessage(error));
    }
  }
}

export const userManagementService = new UserManagementService();
