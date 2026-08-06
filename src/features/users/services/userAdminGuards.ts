import { UserRole } from '@/shared/types/role.types';
import { normalizeUserCode, type AppUser } from '@/shared/types/user.types';

const PROTECTED_ADMIN_CODE = 'ADMIN';

export function countActiveAdmins(
  users: AppUser[],
  exceptUserCode?: string,
): number {
  const except = exceptUserCode
    ? normalizeUserCode(exceptUserCode)
    : undefined;

  return users.filter(
    (user) =>
      !user.isDeleted &&
      user.active &&
      user.role === UserRole.ADMIN &&
      user.userCode !== except,
  ).length;
}

export function assertCanDeactivateUser(
  target: AppUser,
  allUsers: AppUser[],
): void {
  if (target.role !== UserRole.ADMIN || !target.active) {
    return;
  }

  if (countActiveAdmins(allUsers, target.userCode) === 0) {
    throw new Error(
      'Sistemde en az bir aktif Admin bulunmalıdır. Son aktif Admin pasif yapılamaz.',
    );
  }
}

export function assertCanDeleteUser(
  target: AppUser,
  allUsers: AppUser[],
): void {
  if (normalizeUserCode(target.userCode) === PROTECTED_ADMIN_CODE) {
    throw new Error('ADMIN kullanıcısı silinemez.');
  }

  if (target.role === UserRole.ADMIN && target.active) {
    if (countActiveAdmins(allUsers, target.userCode) === 0) {
      throw new Error(
        'Sistemde en az bir aktif Admin bulunmalıdır. Son aktif Admin silinemez.',
      );
    }
  }
}

export function assertCanChangeRoleFromAdmin(
  target: AppUser,
  nextRole: UserRole,
  allUsers: AppUser[],
): void {
  if (target.role !== UserRole.ADMIN || nextRole === UserRole.ADMIN) {
    return;
  }

  if (!target.active || target.isDeleted) {
    return;
  }

  if (countActiveAdmins(allUsers, target.userCode) === 0) {
    throw new Error(
      'Sistemde en az bir aktif Admin bulunmalıdır. Son aktif Admin rolü değiştirilemez.',
    );
  }
}
