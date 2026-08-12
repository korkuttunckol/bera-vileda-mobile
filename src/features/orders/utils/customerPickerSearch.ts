import { filterCustomers } from '@/shared/lib/indexeddb/repositories/customerRepository';
import type { Customer } from '@/shared/types/customer.types';

/**
 * Exact filter options used by Yeni Sipariş → Müşteri seç
 * (`useCachedCustomers`). Kept pure so the picker search path can be
 * unit-tested without React/IndexedDB.
 */
export function filterCustomersForOrderPicker(
  customers: Customer[],
  search: string,
): Customer[] {
  return filterCustomers(customers, {
    search,
    activeFilter: 'active',
  });
}

/** Cap for the unscrolled empty-search list (performance). */
export const ORDER_PICKER_EMPTY_SEARCH_LIMIT = 40;

/**
 * What MobileCustomerSection renders from filtered results.
 * Empty search: first N alphabetically. Non-empty search: all matches
 * (AFM must appear even when the full catalog is huge).
 */
export function visibleOrderPickerCustomers<T>(
  customers: T[],
  search: string,
  emptyLimit = ORDER_PICKER_EMPTY_SEARCH_LIMIT,
): T[] {
  if (search.trim()) return customers;
  return customers.slice(0, emptyLimit);
}
