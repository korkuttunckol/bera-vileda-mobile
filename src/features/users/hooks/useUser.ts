import { useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { userManagementService } from '../services/userManagementService';
import type { AppUserPublic } from '@/shared/types/user.types';

export function useUser(userCode: string | undefined) {
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const [user, setUser] = useState<AppUserPublic | undefined>();
  const [isLoading, setIsLoading] = useState(Boolean(userCode));

  const reload = useCallback(async () => {
    if (!userCode) {
      setUser(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setUser(await userManagementService.getByCode(userCode));
    } finally {
      setIsLoading(false);
    }
  }, [userCode]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  return { user, isLoading, reload };
}
