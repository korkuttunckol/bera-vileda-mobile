import { v4 as uuidv4 } from 'uuid';
import {
  productLocalRepository,
  filterProducts,
} from '@/shared/lib/indexeddb/repositories/productRepository';
import type { Product } from '@/shared/types/product.types';
import type { ProductFormValues } from '@/shared/types/product.schema';

class ProductService {
  async list(search?: string): Promise<Product[]> {
    const all = await productLocalRepository.findActiveNotDeleted();
    return filterProducts(all, { search });
  }

  async getById(id: string): Promise<Product | undefined> {
    const product = await productLocalRepository.getById(id);
    if (!product || product.isDeleted) return undefined;
    return product;
  }

  async findByBarcode(barcode: string): Promise<Product | undefined> {
    const product = await productLocalRepository.findByBarcode(barcode.trim());
    if (!product?.isActive || product.isDeleted) return undefined;
    return product;
  }

  async findBySku(sku: string): Promise<Product | undefined> {
    return productLocalRepository.findBySku(sku.toUpperCase());
  }

  toFormValues(product: Product): ProductFormValues {
    return {
      sku: product.sku,
      name: product.name,
      category: product.category,
      unit: product.unit,
      barcode: product.barcode ?? '',
      listPrice: product.listPrice,
      vatRate: product.vatRate,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
    };
  }

  async create(data: ProductFormValues, userId: string): Promise<Product> {
    const sku = data.sku.trim().toUpperCase();
    const existing = await this.findBySku(sku);
    if (existing) {
      throw new Error('Bu ürün kodu zaten kayıtlı.');
    }

    const now = new Date().toISOString();
    const product: Product = {
      id: uuidv4(),
      localId: uuidv4(),
      sku,
      name: data.name.trim(),
      category: data.category.trim(),
      unit: data.unit.trim(),
      barcode: data.barcode?.trim() || undefined,
      listPrice: data.listPrice,
      vatRate: data.vatRate,
      stockQuantity: data.stockQuantity,
      isActive: data.isActive,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      version: 1,
      syncStatus: 'synced',
    };

    await productLocalRepository.save(product);
    return product;
  }

  async update(
    id: string,
    data: ProductFormValues,
    userId: string,
  ): Promise<Product> {
    const existing = await productLocalRepository.getById(id);
    if (!existing || existing.isDeleted) {
      throw new Error('Ürün bulunamadı.');
    }

    const sku = data.sku.trim().toUpperCase();
    const duplicate = await this.findBySku(sku);
    if (duplicate && duplicate.id !== id) {
      throw new Error('Bu ürün kodu başka bir üründe kullanılıyor.');
    }

    const product: Product = {
      ...existing,
      sku,
      name: data.name.trim(),
      category: data.category.trim(),
      unit: data.unit.trim(),
      barcode: data.barcode?.trim() || undefined,
      listPrice: data.listPrice,
      vatRate: data.vatRate,
      stockQuantity: data.stockQuantity,
      isActive: data.isActive,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
      version: existing.version + 1,
    };

    await productLocalRepository.save(product);
    return product;
  }

  async saveMany(products: Product[]): Promise<void> {
    await productLocalRepository.saveMany(products);
  }
}

export const productService = new ProductService();
