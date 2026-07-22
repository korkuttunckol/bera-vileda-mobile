import { create } from 'zustand';
import { DEFAULT_ORDER_SETTINGS } from '@/shared/types/orderSettings.types';
import {
  loadOrderSettings,
  saveOrderSettings,
} from '@/shared/lib/indexeddb/orderSettingsStorage';

interface OrderSettingsState {
  allowOutOfStockOrders: boolean;
  isLoaded: boolean;
  load: () => Promise<void>;
  setAllowOutOfStockOrders: (value: boolean) => Promise<void>;
}

export const useOrderSettingsStore = create<OrderSettingsState>((set) => ({
  allowOutOfStockOrders: DEFAULT_ORDER_SETTINGS.allowOutOfStockOrders,
  isLoaded: false,
  load: async () => {
    const settings = await loadOrderSettings();
    set({
      allowOutOfStockOrders: settings.allowOutOfStockOrders,
      isLoaded: true,
    });
  },
  setAllowOutOfStockOrders: async (value) => {
    const settings = await saveOrderSettings({ allowOutOfStockOrders: value });
    set({ allowOutOfStockOrders: settings.allowOutOfStockOrders });
  },
}));

export function useAllowOutOfStockOrders(): boolean {
  return useOrderSettingsStore((state) => state.allowOutOfStockOrders);
}
