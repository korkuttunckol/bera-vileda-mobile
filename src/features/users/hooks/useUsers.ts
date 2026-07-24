import { useCallback, useEffect, useState } from 'react';
import { userManagementService } from '../services/userManagementService';
import type { AppUserPublic } from '@/shared/types/user.types';

export function useUsers() {
  const [users, setUsers] = useState<AppUserPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await userManagementService.listUsers();
      setUsers(next);
    } catch (error) {
      console.error('[Users] Kullanıcı listesi yüklenemedi:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { users, isLoading, reload };
}
