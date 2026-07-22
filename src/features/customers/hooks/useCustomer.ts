import { useCallback, useEffect, useState } from 'react';
import { customerService } from '../services/customerService';
import type { Customer } from '@/shared/types/customer.types';

export function useCustomer(id: string | undefined) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) {
      setCustomer(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await customerService.getById(id);
      setCustomer(data ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { customer, isLoading, reload };
}
