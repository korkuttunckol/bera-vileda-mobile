export enum UserRole {
  ADMIN = 'admin',
  SALES_REP = 'salesRep',
  MERCH = 'merch',
  DEPOT = 'depot',
  PACKAGING = 'packaging',
  REPORTING = 'reporting',
  MANAGEMENT = 'management',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SALES_REP]: 'Satış Temsilcisi',
  [UserRole.MERCH]: 'Merch',
  [UserRole.DEPOT]: 'Depo',
  [UserRole.PACKAGING]: 'Paketleme',
  [UserRole.REPORTING]: 'Raporlama',
  [UserRole.MANAGEMENT]: 'Yönetim',
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
  if (value === UserRole.DEPOT) return UserRole.DEPOT;
  if (value === UserRole.PACKAGING) return UserRole.PACKAGING;
  if (value === UserRole.REPORTING) return UserRole.REPORTING;
  if (value === UserRole.MANAGEMENT) return UserRole.MANAGEMENT;
  return null;
}
