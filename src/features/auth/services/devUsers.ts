import { UserRole } from '@/shared/types/role.types';
import { normalizeAppUser, type AppUser } from '@/shared/types/user.types';
import { hashPassword } from '@/shared/lib/crypto/passwordService';

interface DevUserSeed {
  userCode: string;
  password: string;
  name: string;
  role: UserRole;
}

const DEV_USER_SEEDS: DevUserSeed[] = [
  { userCode: 'ADMIN', password: '123456', name: 'Sistem Yöneticisi', role: UserRole.ADMIN },
  { userCode: 'MERCH01', password: '123456', name: 'Merch 01', role: UserRole.MERCH },
  { userCode: 'MERCH02', password: '123456', name: 'Merch 02', role: UserRole.MERCH },
  { userCode: 'MERCH03', password: '123456', name: 'Merch 03', role: UserRole.MERCH },
];

let cachedDevUsers: AppUser[] | null = null;

export async function getDevUsers(): Promise<AppUser[]> {
  if (cachedDevUsers) return cachedDevUsers;

  const now = new Date().toISOString();
  cachedDevUsers = await Promise.all(
    DEV_USER_SEEDS.map(async (seed) =>
      normalizeAppUser({
        id: seed.userCode,
        userCode: seed.userCode,
        passwordHash: await hashPassword(seed.password),
        name: seed.name,
        role: seed.role,
        active: true,
        isDeleted: false,
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
      }),
    ),
  );

  return cachedDevUsers;
}

export async function findDevUserByCode(userCode: string): Promise<AppUser | null> {
  const users = await getDevUsers();
  return users.find((user) => user.userCode === userCode.toUpperCase()) ?? null;
}
