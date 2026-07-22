import { v4 as uuidv4 } from 'uuid';
import { db } from '@/shared/lib/indexeddb/db';
import { seedDemoProductsIfEmpty } from '@/shared/lib/indexeddb/seedDemoProducts';
import type { Customer } from '@/shared/types/customer.types';
import type { CustomerBranch } from '@/shared/types/customer.types';

const DEMO_USER = 'system';

const DEMO_CUSTOMERS: Array<{
  code: string;
  name: string;
  phone: string;
  contactPerson: string;
  city: string;
  district: string;
  fullAddress: string;
  branches: Array<{ name: string; address: string; phone?: string }>;
}> = [
  {
    code: 'CARI-001',
    name: 'Bera Market A.Ş.',
    phone: '0212 555 0101',
    contactPerson: 'Ahmet Yılmaz',
    city: 'İstanbul',
    district: 'Kağıthane',
    fullAddress: 'Sanayi Mah. No:12',
    branches: [
      { name: 'Merkez Depo', address: 'Kağıthane / İstanbul', phone: '0212 555 0102' },
      { name: 'Anadolu Şube', address: 'Ümraniye / İstanbul' },
    ],
  },
  {
    code: 'CARI-002',
    name: 'Temizlik Plus Ltd.',
    phone: '0312 555 0202',
    contactPerson: 'Elif Kaya',
    city: 'Ankara',
    district: 'Çankaya',
    fullAddress: 'Atatürk Bulvarı No:45',
    branches: [{ name: 'Merkez', address: 'Çankaya / Ankara' }],
  },
  {
    code: 'CARI-003',
    name: 'Metro Gross Market',
    phone: '0232 555 0303',
    contactPerson: 'Mehmet Demir',
    city: 'İzmir',
    district: 'Bornova',
    fullAddress: 'Ege Sanayi Sitesi B Blok',
    branches: [
      { name: 'Bornova Mağaza', address: 'Bornova / İzmir' },
      { name: 'Karşıyaka Mağaza', address: 'Karşıyaka / İzmir' },
    ],
  },
];

export async function seedDemoCustomersIfEmpty(): Promise<number> {
  const count = await db.customers.count();
  if (count > 0) return 0;

  const now = new Date().toISOString();
  let branchCount = 0;

  for (const demo of DEMO_CUSTOMERS) {
    const customerId = uuidv4();
    const customer: Customer = {
      id: customerId,
      localId: uuidv4(),
      code: demo.code,
      name: demo.name,
      phone: demo.phone,
      contactPerson: demo.contactPerson,
      salesRepId: DEMO_USER,
      isActive: true,
      isDeleted: false,
      source: 'manual',
      address: {
        city: demo.city,
        district: demo.district,
        fullAddress: demo.fullAddress,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER,
      updatedBy: DEMO_USER,
      version: 1,
      syncStatus: 'synced',
    };

    await db.customers.put(customer);

    for (const b of demo.branches) {
      const branch: CustomerBranch = {
        id: uuidv4(),
        customerId,
        name: b.name,
        address: b.address,
        phone: b.phone,
        isActive: true,
        isDeleted: false,
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
        createdBy: DEMO_USER,
        updatedBy: DEMO_USER,
        version: 1,
      };
      await db.branches.put(branch);
      branchCount++;
    }
  }

  return DEMO_CUSTOMERS.length + branchCount;
}

export async function seedDemoDataIfEmpty(): Promise<void> {
  await seedDemoProductsIfEmpty();
  await seedDemoCustomersIfEmpty();
}

export async function seedDemoDataForce(): Promise<{
  customersAdded: number;
  productCount: number;
  customerCount: number;
}> {
  await seedDemoProductsIfEmpty();
  const customersAdded = await seedDemoCustomersIfEmpty();
  return {
    customersAdded,
    productCount: await db.products.count(),
    customerCount: await db.customers.count(),
  };
}
