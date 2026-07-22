import type { BaseEntity } from './base.types';

export interface Product extends BaseEntity {
  /** Ürün Kodu */
  sku: string;
  /** Ürün Adı */
  name: string;
  category: string;
  /** Birim (Adet, Koli, vb.) */
  unit: string;
  /** Barkod */
  barcode?: string;
  listPrice: number;
  vatRate: number;
  isActive: boolean;
  imageUrl?: string;
  erpId?: string;
  minOrderQty?: number;
  packSize?: number;
  /** Depo Stok Miktarı */
  stockQuantity: number;
  isDeleted?: boolean;
}

export type ProductSearchField = 'all' | 'barcode' | 'sku' | 'name';
