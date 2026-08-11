import { db, type LocalProduct } from '../db';
import { BaseRepository } from './baseRepository';
import type { SyncStatus } from '@/shared/types/base.types';
import { normalizeSearchText } from '@/shared/utils/normalizeSearchText';

class ProductLocalRepository extends BaseRepository<LocalProduct> {
  protected tableName = 'products';

  async getById(id: string): Promise<LocalProduct | undefined> {
    return db.products.get(id);
  }

  async getAll(): Promise<LocalProduct[]> {
    return db.products.toArray();
  }

  async save(entity: LocalProduct): Promise<void> {
    await db.products.put(entity);
  }

  async saveMany(entities: LocalProduct[]): Promise<void> {
    await db.products.bulkPut(entities);
  }

  delete(_id: string): Promise<void> {
    return Promise.reject(new Error('Fiziksel silme yasaktır.'));
  }

  async findBySyncStatus(status: SyncStatus): Promise<LocalProduct[]> {
    return db.products.where('syncStatus').equals(status).toArray();
  }

  async findBySku(sku: string): Promise<LocalProduct | undefined> {
    return db.products.where('sku').equals(sku).first();
  }

  async findByBarcode(barcode: string): Promise<LocalProduct | undefined> {
    return db.products.where('barcode').equals(barcode).first();
  }

  async findActive(): Promise<LocalProduct[]> {
    return db.products.filter((p) => p.isActive && !p.isDeleted).toArray();
  }

  async findActiveNotDeleted(): Promise<LocalProduct[]> {
    return this.findActive();
  }
}

export const productLocalRepository = new ProductLocalRepository();

export function dedupeProducts(products: LocalProduct[]): LocalProduct[] {
  const byKey = new Map<string, LocalProduct>();

  for (const product of products) {
    const sku = product.sku.trim().toUpperCase();
    const barcode = (product.barcode ?? '').trim();
    const name = product.name.trim().toLocaleLowerCase('tr-TR');
    const key = `${sku}|${barcode}|${name}`;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, product);
      continue;
    }

    const preferred =
      product.version > existing.version ||
      (product.version === existing.version &&
        product.updatedAt >= existing.updatedAt)
        ? product
        : existing;
    byKey.set(key, preferred);
  }

  return Array.from(byKey.values());
}

export type ProductActiveFilter = 'all' | 'active' | 'passive';

export function filterProducts(
  products: LocalProduct[],
  options: {
    search?: string;
    activeFilter?: ProductActiveFilter;
    includeDeleted?: boolean;
  },
): LocalProduct[] {
  let result = options.includeDeleted
    ? [...products]
    : products.filter((p) => !p.isDeleted);

  result = dedupeProducts(result);

  if (options.activeFilter === 'active') {
    result = result.filter((p) => p.isActive);
  } else if (options.activeFilter === 'passive') {
    result = result.filter((p) => !p.isActive);
  }

  if (options.search?.trim()) {
    const raw = options.search.trim();
    const term = normalizeSearchText(raw);
    result = result.filter((p) => {
      if (!term) return true;
      const name = normalizeSearchText(p.name);
      const sku = normalizeSearchText(p.sku);
      const barcode = normalizeSearchText(p.barcode);
      // Exact raw barcode kept for scanner / paste paths.
      return (
        name.includes(term) ||
        sku.includes(term) ||
        barcode.includes(term) ||
        p.barcode === raw
      );
    });
  }

  return result.sort((a, b) =>
    normalizeSearchText(a.name).localeCompare(normalizeSearchText(b.name), 'tr-TR'),
  );
}
