import { useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import {
  productService,
  type ProductActiveFilter,
} from '../services/productService';
import type { Product } from '@/shared/types/product.types';

export function useProducts(
  search: string,
  activeFilter: ProductActiveFilter = 'active',
  groupCode?: string,
) {
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const [products, setProducts] = useState<Product[]>([]);
  const [groupCodes, setGroupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, codes] = await Promise.all([
        productService.list(search, activeFilter, groupCode),
        productService.listGroupCodes(),
      ]);
      setProducts(list);
      setGroupCodes(codes);
    } finally {
      setIsLoading(false);
    }
  }, [search, activeFilter, groupCode]);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  return { products, groupCodes, isLoading, reload };
}
