export enum UserRole {
  ADMIN = 'admin',
  MERCH = 'merch',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.MERCH]: 'Merch',
};

export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export function isMerch(role: UserRole): boolean {
  return role === UserRole.MERCH;
}

export function parseUserRole(value: unknown): UserRole | null {
  if (value === UserRole.ADMIN) return UserRole.ADMIN;
  if (value === UserRole.MERCH) return UserRole.MERCH;
  return null;
}
