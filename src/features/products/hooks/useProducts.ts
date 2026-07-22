import { useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { productService } from '../services/productService';
import type { Product } from '@/shared/types/product.types';

export function useProducts(search: string) {
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await productService.list(search);
      setProducts(list);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  return { products, isLoading, reload };
}
