import type { BaseEntity } from './base.types';

export interface Product extends BaseEntity {
  /** Ürün Kodu (Logo PRODUCERCODE) */
  sku: string;
  /** Ürün Adı (Logo NAME) */
  name: string;
  category: string;
  /** Birim (Adet, Koli, vb.) */
  unit: string;
  /** Barkod (Logo CODE) — asla sku ile karıştırılmaz */
  barcode?: string;
  listPrice: number;
  vatRate: number;
  isActive: boolean;
  imageUrl?: string;
  erpId?: string;
  minOrderQty?: number;
  packSize?: number;
  /** Depo Stok Miktarı (Logo MERKEZ when stockSource === 'logo') */
  stockQuantity: number;
  /**
   * Who last authored stockQuantity.
   * When 'logo', Firestore PullSync must not overwrite stockQuantity.
   */
  stockSource?: 'logo' | 'excel' | 'firestore' | 'manual';
  /** ISO timestamp of last successful Logo stock sync for this product */
  lastLogoSyncedAt?: string;
  /** Logo STGRPCODE — ana grup / marka (category ile birleştirilmez) */
  groupCode?: string;
  /** Logo SPECODE — özel kod */
  specialCode?: string;
  /** Logo SPECODE2 — özel kod 2 */
  specialCode2?: string;
  isDeleted?: boolean;
}

export type ProductSearchField = 'all' | 'barcode' | 'sku' | 'name';
