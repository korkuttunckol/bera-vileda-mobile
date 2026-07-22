import { useProductDisplayFields } from '@/stores/displayPreferencesStore';
import { isProductFieldVisible } from '@/shared/lib/indexeddb/displayPreferencesStorage';
import type { ProductDisplayField } from '@/shared/types/displayPreferences.types';

export function useProductFieldVisibility(options?: { formMode?: boolean }) {
  const productFields = useProductDisplayFields();
  return (field: ProductDisplayField): boolean =>
    isProductFieldVisible(productFields, field, options);
}
