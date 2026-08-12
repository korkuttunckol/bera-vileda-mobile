/**
 * Pure helpers for Yeni Sipariş search visibility (Android WebView layout).
 */

/** Keep cari picker mounted under the soft keyboard (POC bug was unmounting it). */
export function shouldKeepCustomerPickerMounted(options: {
  keyboardOpen: boolean;
  customerId?: string;
  customerPickerOpen: boolean;
}): boolean {
  if (!options.keyboardOpen) return true;
  if (!options.customerId) return true;
  if (options.customerPickerOpen) return true;
  return false;
}

/** Hide cart "Alınan Siparişler" while typing so matches stay at the top. */
export function shouldShowTakenProductsSection(search: string): boolean {
  return !search.trim();
}
