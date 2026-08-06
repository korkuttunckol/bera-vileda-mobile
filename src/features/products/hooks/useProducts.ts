import { useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import {
  productService,
  type ProductActiveFilter,
} from '../services/productService';
import type { Product } from '@/shared/types/product.types';

export function useProducts(
  search: string,
  activeFilter: ProductActiveFilter = 'all',
) {
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await productService.list(search, activeFilter);
      setProducts(list);
    } finally {
      setIsLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  return { products, isLoading, reload };
}
