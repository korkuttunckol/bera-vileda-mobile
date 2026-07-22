import { getMetaValue, setMetaValue } from '@/shared/lib/indexeddb/db';
import {
  DEFAULT_ORDER_SETTINGS,
  type OrderSettings,
} from '@/shared/types/orderSettings.types';

const META_KEY = 'orderSettings';
const STORAGE_KEY = 'bera-order-settings-v1';

function normalizeSettings(raw: Partial<OrderSettings>): OrderSettings {
  return {
    allowOutOfStockOrders: raw.allowOutOfStockOrders === true,
  };
}

function readLocalStorage(): OrderSettings | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeSettings(JSON.parse(raw) as Partial<OrderSettings>);
  } catch {
    return null;
  }
}

function writeLocalStorage(settings: OrderSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function loadOrderSettings(): Promise<OrderSettings> {
  try {
    const raw = await getMetaValue(META_KEY);
    if (raw) {
      const settings = normalizeSettings(JSON.parse(raw) as Partial<OrderSettings>);
      writeLocalStorage(settings);
      return settings;
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

  return { ...DEFAULT_ORDER_SETTINGS };
}

export async function saveOrderSettings(
  settings: OrderSettings,
): Promise<OrderSettings> {
  const normalized = normalizeSettings(settings);
  writeLocalStorage(normalized);
  await setMetaValue(META_KEY, JSON.stringify(normalized));
  return normalized;
}
