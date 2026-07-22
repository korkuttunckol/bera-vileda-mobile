import { useEffect, useState, useCallback } from 'react';
import { productService } from '../services/productService';
import type { Product } from '@/shared/types/product.types';

export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | undefined>();
  const [isLoading, setIsLoading] = useState(Boolean(id));

  const reload = useCallback(async (): Promise<void> => {
    if (!id) {
      setProduct(undefined);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setProduct(await productService.getById(id));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { product, isLoading, reload };
}
