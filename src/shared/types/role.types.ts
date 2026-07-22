export enum UserRole {
  ADMIN = 'admin',
  SALES_REP = 'sales_rep',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.SALES_REP]: 'Satış Temsilcisi',
};

export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export function isSalesRep(role: UserRole): boolean {
  return role === UserRole.SALES_REP;
}
