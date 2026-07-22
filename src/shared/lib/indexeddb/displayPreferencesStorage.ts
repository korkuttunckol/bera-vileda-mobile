import { getMetaValue, setMetaValue } from '@/shared/lib/indexeddb/db';
import {
  DEFAULT_CUSTOMER_DISPLAY_FIELDS,
  DEFAULT_PRODUCT_DISPLAY_FIELDS,
  ALL_CUSTOMER_DISPLAY_FIELDS,
  ALL_PRODUCT_DISPLAY_FIELDS,
  type CustomerDisplayField,
  type DisplayPreferences,
  type ProductDisplayField,
} from '@/shared/types/displayPreferences.types';

const META_KEY = 'displayPreferences';
const STORAGE_KEY = 'bera-display-preferences-v1';

function sanitizeCustomerFields(
  fields: CustomerDisplayField[],
): CustomerDisplayField[] {
  const valid = fields.filter((field) =>
    ALL_CUSTOMER_DISPLAY_FIELDS.includes(field),
  );
  const merged: CustomerDisplayField[] = valid.includes('name')
    ? valid
    : ['name', ...valid];
  return [...new Set(merged)];
}

function sanitizeProductFields(
  fields: ProductDisplayField[],
): ProductDisplayField[] {
  const valid = fields.filter((field) =>
    ALL_PRODUCT_DISPLAY_FIELDS.includes(field),
  );
  const merged: ProductDisplayField[] = valid.includes('name')
    ? valid
    : ['name', ...valid];
  return [...new Set(merged)];
}

function normalizePreferences(raw: Partial<DisplayPreferences>): DisplayPreferences {
  return {
    customerFields: sanitizeCustomerFields(
      raw.customerFields ?? DEFAULT_CUSTOMER_DISPLAY_FIELDS,
    ),
    productFields: sanitizeProductFields(
      raw.productFields ?? DEFAULT_PRODUCT_DISPLAY_FIELDS,
    ),
  };
}

function readLocalStorage(): DisplayPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizePreferences(JSON.parse(raw) as Partial<DisplayPreferences>);
  } catch {
    return null;
  }
}

function writeLocalStorage(preferences: DisplayPreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export async function loadDisplayPreferences(): Promise<DisplayPreferences> {
  try {
    const raw = await getMetaValue(META_KEY);
    if (raw) {
      const preferences = normalizePreferences(
        JSON.parse(raw) as Partial<DisplayPreferences>,
      );
      writeLocalStorage(preferences);
      return preferences;
    }
  } catch {
    // IndexedDB okunamazsa localStorage'a düş.
  }

  const cached = readLocalStorage();
  if (cached) {
    try {
      await setMetaValue(META_KEY, JSON.stringify(cached));
    } catch {
      // meta yazılamasa da cache kullanılabilir.
    }
    return cached;
  }

  return {
    customerFields: DEFAULT_CUSTOMER_DISPLAY_FIELDS,
    productFields: DEFAULT_PRODUCT_DISPLAY_FIELDS,
  };
}

export async function saveDisplayPreferences(
  preferences: DisplayPreferences,
): Promise<DisplayPreferences> {
  const normalized = normalizePreferences(preferences);
  writeLocalStorage(normalized);
  await setMetaValue(META_KEY, JSON.stringify(normalized));
  return normalized;
}

export function isCustomerFieldVisible(
  fields: CustomerDisplayField[],
  field: CustomerDisplayField,
  options?: { formMode?: boolean },
): boolean {
  if (options?.formMode && (field === 'code' || field === 'name')) {
    return true;
  }
  return fields.includes(field);
}

export function isProductFieldVisible(
  fields: ProductDisplayField[],
  field: ProductDisplayField,
  options?: { formMode?: boolean },
): boolean {
  if (options?.formMode && (field === 'sku' || field === 'name')) {
    return true;
  }
  return fields.includes(field);
}

export function hasCustomerAddressFields(
  fields: CustomerDisplayField[],
): boolean {
  return (
    fields.includes('city') ||
    fields.includes('district') ||
    fields.includes('fullAddress')
  );
}
