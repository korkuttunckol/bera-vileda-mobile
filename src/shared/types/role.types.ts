export enum UserRole {
  ADMIN = 'admin',
  SALES_REP = 'salesRep',
  MERCH = 'merch',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SALES_REP]: 'Satış Temsilcisi',
  [UserRole.MERCH]: 'Merch',
};

export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export function isSalesRep(role: UserRole): boolean {
  return role === UserRole.SALES_REP;
}

export function isMerch(role: UserRole): boolean {
  return role === UserRole.MERCH;
}

export function parseUserRole(value: unknown): UserRole | null {
  if (value === UserRole.ADMIN) return UserRole.ADMIN;
  if (value === UserRole.SALES_REP) return UserRole.SALES_REP;
  if (value === UserRole.MERCH) return UserRole.MERCH;
  return null;
}
