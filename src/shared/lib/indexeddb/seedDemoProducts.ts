import { v4 as uuidv4 } from 'uuid';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import type { Product } from '@/shared/types/product.types';

const DEMO_PRODUCTS: Omit<
  Product,
  'id' | 'localId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>[] = [
  {
    sku: 'VLD-001',
    name: 'Vileda Turbo 2in1 Paspas',
    category: 'Paspas',
    unit: 'Adet',
    barcode: '8690637030011',
    listPrice: 249.9,
    vatRate: 20,
    isActive: true,
    stockQuantity: 45,
    syncStatus: 'synced',
    version: 1,
    isDeleted: false,
  },
  {
    sku: 'VLD-002',
    name: 'Vileda Microfiber Bez 5li',
    category: 'Bez',
    unit: 'Paket',
    barcode: '8690637030028',
    listPrice: 89.9,
    vatRate: 20,
    isActive: true,
    stockQuantity: 120,
    syncStatus: 'synced',
    version: 1,
    isDeleted: false,
  },
  {
    sku: 'VLD-003',
    name: 'Vileda SuperMocio Yedek Ucu',
    category: 'Yedek Parça',
    unit: 'Adet',
    barcode: '8690637030035',
    listPrice: 59.9,
    vatRate: 20,
    isActive: true,
    stockQuantity: 0,
    syncStatus: 'synced',
    version: 1,
    isDeleted: false,
  },
  {
    sku: 'VLD-004',
    name: 'Vileda Cam Sileceği',
    category: 'Temizlik',
    unit: 'Adet',
    barcode: '8690637030042',
    listPrice: 129.9,
    vatRate: 20,
    isActive: true,
    stockQuantity: 18,
    syncStatus: 'synced',
    version: 1,
    isDeleted: false,
  },
  {
    sku: 'VLD-005',
    name: 'Vileda Eldiven Medium',
    category: 'Eldiven',
    unit: 'Adet',
    barcode: '8690637030059',
    listPrice: 39.9,
    vatRate: 20,
    isActive: true,
    stockQuantity: 200,
    syncStatus: 'synced',
    version: 1,
    isDeleted: false,
  },
];

export async function seedDemoProductsIfEmpty(): Promise<void> {
  const now = new Date().toISOString();

  for (const demo of DEMO_PRODUCTS) {
    const existing = await productLocalRepository.findBySku(demo.sku);
    if (existing) continue;

    const product: Product = {
      ...demo,
      id: uuidv4(),
      localId: uuidv4(),
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
    };

    await productLocalRepository.save(product);
  }
}
