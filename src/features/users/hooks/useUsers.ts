import { useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { userManagementService } from '../services/userManagementService';
import type {
  AppUserPublic,
  UserActiveFilter,
  UserRoleFilter,
} from '@/shared/types/user.types';

export function useUsers(
  activeFilter: UserActiveFilter = 'all',
  roleFilter: UserRoleFilter = 'all',
) {
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const [users, setUsers] = useState<AppUserPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await userManagementService.listUsers({
        activeFilter,
        roleFilter,
      });
      setUsers(next);
    } catch (error) {
      console.error('[Users] Kullanıcı listesi yüklenemedi:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, roleFilter]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  return { users, isLoading, reload };
}
