import { useCallback, useEffect, useState } from 'react';
import { branchService } from '../services/branchService';
import type { CustomerBranch } from '@/shared/types/customer.types';

export function useBranches(customerId: string | undefined) {
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!customerId) {
      setBranches([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const list = await branchService.listByCustomer(customerId);
      setBranches(list);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { branches, isLoading, reload };
}
