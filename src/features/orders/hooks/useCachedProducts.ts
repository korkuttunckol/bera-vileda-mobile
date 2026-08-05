import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { productService } from '@/features/products/services/productService';
import { filterProducts } from '@/shared/lib/indexeddb/repositories/productRepository';
import type { Product } from '@/shared/types/product.types';
import { useDebouncedValue } from './useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 200;

/**
 * Load active products once (per sync revision), filter client-side.
 * Search filtering does not show a spinner.
 */
export function useCachedProducts(search: string) {
  const dataRevision = useSyncStore((s) => s.dataRevision);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const reload = useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const list = await productService.list();
      setAllProducts(list);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, dataRevision]);

  const products = useMemo(
    () => filterProducts(allProducts, { search: debouncedSearch }),
    [allProducts, debouncedSearch],
  );

  return { products, allProducts, isInitialLoading, reload };
}
