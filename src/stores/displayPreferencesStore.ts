import { create } from 'zustand';
import {
  DEFAULT_CUSTOMER_DISPLAY_FIELDS,
  DEFAULT_PRODUCT_DISPLAY_FIELDS,
  type CustomerDisplayField,
  type DisplayPreferences,
  type ProductDisplayField,
} from '@/shared/types/displayPreferences.types';
import {
  isCustomerFieldVisible,
  isProductFieldVisible,
  loadDisplayPreferences,
  saveDisplayPreferences,
} from '@/shared/lib/indexeddb/displayPreferencesStorage';

interface DisplayPreferencesState extends DisplayPreferences {
  isLoaded: boolean;
  load: () => Promise<void>;
  setCustomerFields: (fields: CustomerDisplayField[]) => Promise<void>;
  setProductFields: (fields: ProductDisplayField[]) => Promise<void>;
  toggleCustomerField: (field: CustomerDisplayField) => Promise<void>;
  toggleProductField: (field: ProductDisplayField) => Promise<void>;
}

export const useDisplayPreferencesStore = create<DisplayPreferencesState>(
  (set, get) => ({
    customerFields: DEFAULT_CUSTOMER_DISPLAY_FIELDS,
    productFields: DEFAULT_PRODUCT_DISPLAY_FIELDS,
    isLoaded: false,
    load: async () => {
      const preferences = await loadDisplayPreferences();
      set({
        customerFields: preferences.customerFields,
        productFields: preferences.productFields,
        isLoaded: true,
      });
    },
    setCustomerFields: async (fields) => {
      const preferences = await saveDisplayPreferences({
        customerFields: fields,
        productFields: get().productFields,
      });
      set({ customerFields: preferences.customerFields });
    },
    setProductFields: async (fields) => {
      const preferences = await saveDisplayPreferences({
        customerFields: get().customerFields,
        productFields: fields,
      });
      set({ productFields: preferences.productFields });
    },
    toggleCustomerField: async (field) => {
      if (field === 'name') return;
      const current = get().customerFields;
      const next = current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field];
      await get().setCustomerFields(next);
    },
    toggleProductField: async (field) => {
      if (field === 'name') return;
      const current = get().productFields;
      const next = current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field];
      await get().setProductFields(next);
    },
  }),
);

export function useCustomerDisplayFields(): CustomerDisplayField[] {
  return useDisplayPreferencesStore((state) => state.customerFields);
}

export function useProductDisplayFields(): ProductDisplayField[] {
  return useDisplayPreferencesStore((state) => state.productFields);
}

export function useIsCustomerFieldVisible(
  field: CustomerDisplayField,
  options?: { formMode?: boolean },
): boolean {
  const fields = useCustomerDisplayFields();
  return isCustomerFieldVisible(fields, field, options);
}

export function useIsProductFieldVisible(
  field: ProductDisplayField,
  options?: { formMode?: boolean },
): boolean {
  const fields = useProductDisplayFields();
  return isProductFieldVisible(fields, field, options);
}
