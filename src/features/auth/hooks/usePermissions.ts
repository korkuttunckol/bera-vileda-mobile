import { useAuth } from '../hooks/useAuth';
import { UserRole } from '@/shared/types/role.types';
import { hasPermission, type Permission } from '../permissions';

export function usePermissions() {
  const { user } = useAuth();

  return {
    user,
    isAdmin: user?.role === UserRole.ADMIN,
    isSalesRep: user?.role === UserRole.SALES_REP,
    isMerch: user?.role === UserRole.MERCH,
    can: (permission: Permission): boolean => hasPermission(user, permission),
  };
}
