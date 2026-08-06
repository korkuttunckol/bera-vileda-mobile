import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@/shared/types/role.types';
import type { AppUser } from '@/shared/types/user.types';

const store = new Map<string, AppUser>();
const firestore = new Map<string, AppUser>();

vi.mock('@/config/env', () => ({
  isFirebaseConfigured: () => true,
  env: {
    VITE_FIREBASE_API_KEY: 'test',
    VITE_FIREBASE_AUTH_DOMAIN: 'test',
    VITE_FIREBASE_PROJECT_ID: 'test',
    VITE_FIREBASE_STORAGE_BUCKET: 'test',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'test',
    VITE_FIREBASE_APP_ID: 'test',
    VITE_APP_ENV: 'development',
  },
}));

vi.mock('@/features/sync/services/syncService', () => ({
  syncService: {
    notifyDataChanged: vi.fn(),
  },
}));

vi.mock('@/shared/lib/crypto/passwordService', () => ({
  hashPassword: async (password: string) => `hash:${password}`,
  verifyPassword: async (password: string, hash: string) =>
    hash === `hash:${password}`,
}));

vi.mock('@/shared/lib/indexeddb/repositories/userRepository', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/indexeddb/repositories/userRepository')
  >('@/shared/lib/indexeddb/repositories/userRepository');

  return {
    ...actual,
    userLocalRepository: {
      async upsert(user: AppUser) {
        store.set(user.userCode, { ...user });
      },
      async upsertMany(users: AppUser[]) {
        for (const user of users) store.set(user.userCode, { ...user });
      },
      async findByCode(userCode: string) {
        return store.get(userCode.toUpperCase());
      },
      async findAll() {
        return [...store.values()];
      },
      async findAllNotDeleted() {
        return [...store.values()].filter((user) => !user.isDeleted);
      },
      async findBySyncStatus(status: string) {
        return [...store.values()].filter((user) => user.syncStatus === status);
      },
      async replaceAll(users: AppUser[]) {
        store.clear();
        for (const user of users) store.set(user.userCode, { ...user });
      },
      async remove(userCode: string) {
        store.delete(userCode.toUpperCase());
      },
    },
  };
});

vi.mock('@/shared/lib/firebase/userFirestoreService', () => ({
  upsertUserToFirestore: async (user: AppUser) => {
    const synced = { ...user, syncStatus: 'synced' as const };
    firestore.set(user.userCode, synced);
    return synced;
  },
  fetchAllUsersFromFirestore: async () => [...firestore.values()],
  fetchUserByCodeFromFirestore: async (code: string) =>
    firestore.get(code.toUpperCase()) ?? null,
}));

function seedAdmin(): AppUser {
  const admin: AppUser = {
    id: 'ADMIN',
    userCode: 'ADMIN',
    passwordHash: 'hash:123456',
    name: 'Sistem Yöneticisi',
    role: UserRole.ADMIN,
    active: true,
    isDeleted: false,
    syncStatus: 'synced',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  store.set('ADMIN', admin);
  firestore.set('ADMIN', admin);
  return admin;
}

describe('User management runtime', () => {
  beforeEach(() => {
    store.clear();
    firestore.clear();
    vi.stubGlobal('navigator', { onLine: true });
    vi.resetModules();
    seedAdmin();
  });

  it('creates user in local + firestore by userCode (no duplicate doc id)', async () => {
    const { userManagementService } = await import(
      '@/features/users/services/userManagementService'
    );

    const created = await userManagementService.createUser({
      userCode: 'merch10',
      name: 'Merch On',
      password: 'secret1',
      role: UserRole.MERCH,
    });

    expect(created.userCode).toBe('MERCH10');
    expect(store.get('MERCH10')?.syncStatus).toBe('synced');
    expect(firestore.get('MERCH10')?.name).toBe('Merch On');
    expect(firestore.size).toBe(2);
  });

  it('soft-deletes user so it disappears from list but stays upserted in firestore', async () => {
    const { userManagementService } = await import(
      '@/features/users/services/userManagementService'
    );

    await userManagementService.createUser({
      userCode: 'MERCH11',
      name: 'Silinecek',
      password: 'secret1',
      role: UserRole.MERCH,
    });

    await userManagementService.softDeleteUser('MERCH11');

    const list = await userManagementService.listUsers();
    expect(list.find((user) => user.userCode === 'MERCH11')).toBeUndefined();
    expect(store.get('MERCH11')?.isDeleted).toBe(true);
    expect(store.get('MERCH11')?.active).toBe(false);
    expect(firestore.get('MERCH11')?.isDeleted).toBe(true);
  });

  it('does not resurrect deleted users via seed fallback', async () => {
    const { userManagementService } = await import(
      '@/features/users/services/userManagementService'
    );

    await userManagementService.createUser({
      userCode: 'MERCH12',
      name: 'Gone',
      password: 'secret1',
      role: UserRole.MERCH,
    });
    await userManagementService.softDeleteUser('MERCH12');

    // Empty non-deleted view only — list must not call getDevUsers.
    const list = await userManagementService.listUsers({ activeFilter: 'all' });
    expect(list.map((user) => user.userCode)).toEqual(['ADMIN']);
  });

  it('deactivates user and keeps them out of active filter', async () => {
    const { userManagementService } = await import(
      '@/features/users/services/userManagementService'
    );

    await userManagementService.createUser({
      userCode: 'MERCH13',
      name: 'Passive',
      password: 'secret1',
      role: UserRole.MERCH,
    });
    await userManagementService.setUserActive('MERCH13', false);

    expect(firestore.get('MERCH13')?.active).toBe(false);
    const active = await userManagementService.listUsers({
      activeFilter: 'active',
    });
    const passive = await userManagementService.listUsers({
      activeFilter: 'passive',
    });
    expect(active.find((user) => user.userCode === 'MERCH13')).toBeUndefined();
    expect(passive.find((user) => user.userCode === 'MERCH13')).toBeTruthy();
  });

  it('blocks deleting ADMIN and last active admin', async () => {
    const { userManagementService } = await import(
      '@/features/users/services/userManagementService'
    );

    await expect(userManagementService.softDeleteUser('ADMIN')).rejects.toThrow(
      /ADMIN kullanıcısı silinemez/,
    );

    await expect(
      userManagementService.setUserActive('ADMIN', false),
    ).rejects.toThrow(/en az bir aktif Admin/);
  });

  it('changes password and syncs hash', async () => {
    const { userManagementService } = await import(
      '@/features/users/services/userManagementService'
    );

    await userManagementService.createUser({
      userCode: 'MERCH14',
      name: 'Pwd',
      password: 'secret1',
      role: UserRole.MERCH,
    });
    await userManagementService.changePassword('MERCH14', 'secret99');

    expect(store.get('MERCH14')?.passwordHash).toBe('hash:secret99');
    expect(firestore.get('MERCH14')?.passwordHash).toBe('hash:secret99');
  });

  it('keeps pending offline and pushes on pushPendingUsers', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const { userManagementService } = await import(
      '@/features/users/services/userManagementService'
    );

    const created = await userManagementService.createUser({
      userCode: 'MERCH15',
      name: 'Offline',
      password: 'secret1',
      role: UserRole.MERCH,
    });
    expect(created.syncStatus).toBe('pending');
    expect(firestore.has('MERCH15')).toBe(false);

    vi.stubGlobal('navigator', { onLine: true });
    const { pushPendingUsers } = await import(
      '@/features/users/services/userPushService'
    );
    const stats = await pushPendingUsers();
    expect(stats.synced).toBe(1);
    expect(firestore.get('MERCH15')?.name).toBe('Offline');
    expect(store.get('MERCH15')?.syncStatus).toBe('synced');
  });

  it('updates existing firestore user by userCode on second create/upsert path', async () => {
    const { userManagementService } = await import(
      '@/features/users/services/userManagementService'
    );

    await userManagementService.createUser({
      userCode: 'MERCH16',
      name: 'First',
      password: 'secret1',
      role: UserRole.MERCH,
    });

    // Simulate re-import style: soft-deleted then recreate same code → same doc id
    await userManagementService.softDeleteUser('MERCH16');
    await userManagementService.createUser({
      userCode: 'MERCH16',
      name: 'Second',
      password: 'secret2',
      role: UserRole.MERCH,
    });

    expect(firestore.size).toBe(2); // ADMIN + MERCH16 only
    expect(firestore.get('MERCH16')?.name).toBe('Second');
    expect(firestore.get('MERCH16')?.isDeleted).toBe(false);
  });
});

describe('mergeUsersFromRemote preserves pending', () => {
  beforeEach(() => {
    store.clear();
    firestore.clear();
    vi.resetModules();
  });

  it('keeps newer pending local over older remote', async () => {
    store.set('MERCH20', {
      id: 'MERCH20',
      userCode: 'MERCH20',
      passwordHash: 'hash:local',
      name: 'Local Pending',
      role: UserRole.MERCH,
      active: true,
      isDeleted: false,
      syncStatus: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    });

    const { mergeUsersFromRemote } = await import('@/shared/lib/sync/PullSync');
    await mergeUsersFromRemote([
      {
        id: 'MERCH20',
        userCode: 'MERCH20',
        passwordHash: 'hash:remote',
        name: 'Remote Old',
        role: UserRole.MERCH,
        active: true,
        isDeleted: false,
        syncStatus: 'synced',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ]);

    expect(store.get('MERCH20')?.name).toBe('Local Pending');
    expect(store.get('MERCH20')?.syncStatus).toBe('pending');
  });
});
