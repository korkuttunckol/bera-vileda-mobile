import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { customerService } from '../services/customerService';
import type { Customer } from '@/shared/types/customer.types';
import type { CustomerActiveFilter } from '@/shared/lib/indexeddb/repositories/customerRepository';

export function useCustomers(
  search: string,
  activeFilter: CustomerActiveFilter,
) {
  const user = useAuthStore((s) => s.user);
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const list = await customerService.list(user.uid, user.role, {
        search,
        activeFilter,
      });
      setCustomers(list);
    } finally {
      setIsLoading(false);
    }
  }, [user, search, activeFilter]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  return { customers, isLoading, reload };
}
