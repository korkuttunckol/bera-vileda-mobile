import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { customerService } from '@/features/customers/services/customerService';
import { filterCustomersForOrderPicker } from '@/features/orders/utils/customerPickerSearch';
import type { Customer } from '@/shared/types/customer.types';
import { useDebouncedValue } from './useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 200;

/**
 * Load customers once (per sync revision), filter client-side.
 * Search filtering does not show a spinner.
 */
export function useCachedCustomers(search: string) {
  const user = useAuthStore((s) => s.user);
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const reload = useCallback(async () => {
    if (!user) return;
    setIsInitialLoading(true);
    try {
      const list = await customerService.list(user.uid, user.role, {
        activeFilter: 'active',
      });
      setAllCustomers(list);
    } finally {
      setIsInitialLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  const customers = useMemo(
    () => filterCustomersForOrderPicker(allCustomers, debouncedSearch),
    [allCustomers, debouncedSearch],
  );

  return { customers, allCustomers, isInitialLoading, reload };
}
