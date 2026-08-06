import { describe, expect, it } from 'vitest';
import {
  assertCanDeactivateUser,
  assertCanDeleteUser,
  countActiveAdmins,
} from '@/features/users/services/userAdminGuards';
import { UserRole } from '@/shared/types/role.types';
import type { AppUser } from '@/shared/types/user.types';

function user(overrides: Partial<AppUser> & Pick<AppUser, 'userCode' | 'role'>): AppUser {
  return {
    id: overrides.userCode,
    passwordHash: 'x',
    name: overrides.userCode,
    active: true,
    isDeleted: false,
    syncStatus: 'synced',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('userAdminGuards', () => {
  it('counts only active non-deleted admins', () => {
    const users = [
      user({ userCode: 'ADMIN', role: UserRole.ADMIN }),
      user({ userCode: 'A2', role: UserRole.ADMIN, active: false }),
      user({ userCode: 'A3', role: UserRole.ADMIN, isDeleted: true }),
      user({ userCode: 'M1', role: UserRole.MERCH }),
    ];
    expect(countActiveAdmins(users)).toBe(1);
  });

  it('blocks last admin deactivate/delete', () => {
    const admin = user({ userCode: 'ADMIN', role: UserRole.ADMIN });
    const users = [admin];
    expect(() => {
      assertCanDeactivateUser(admin, users);
    }).toThrow(/pasif/);
    expect(() => {
      assertCanDeleteUser(admin, users);
    }).toThrow(/ADMIN kullanıcısı silinemez/);
  });

  it('allows deleting non-admin when another admin exists', () => {
    const merch = user({ userCode: 'MERCH01', role: UserRole.MERCH });
    const users = [
      user({ userCode: 'ADMIN', role: UserRole.ADMIN }),
      merch,
    ];
    expect(() => {
      assertCanDeleteUser(merch, users);
    }).not.toThrow();
  });
});
