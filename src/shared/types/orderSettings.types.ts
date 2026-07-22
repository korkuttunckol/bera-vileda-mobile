export interface OrderSettings {
  /** Stokta olmayan ürünlerin siparişe eklenmesine izin ver */
  allowOutOfStockOrders: boolean;
}

export const DEFAULT_ORDER_SETTINGS: OrderSettings = {
  allowOutOfStockOrders: true,
};
