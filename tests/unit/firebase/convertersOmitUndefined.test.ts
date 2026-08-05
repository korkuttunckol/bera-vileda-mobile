import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  branchConverter,
  customerConverter,
  omitUndefinedDeep,
  orderConverter,
  productConverter,
} from '@/shared/lib/firebase/converters';
import type { Customer, CustomerBranch } from '@/shared/types/customer.types';
import type { Order } from '@/shared/types/order.types';
import type { Product } from '@/shared/types/product.types';

describe('omitUndefinedDeep', () => {
  it('removes undefined own properties and keeps null', () => {
    const result = omitUndefinedDeep({
      phone: undefined,
      email: 'a@b.c',
      deletedAt: null,
      address: {
        city: 'İstanbul',
        district: undefined,
      },
    });

    expect(result).toEqual({
      email: 'a@b.c',
      deletedAt: null,
      address: {
        city: 'İstanbul',
      },
    });
    expect(Object.prototype.hasOwnProperty.call(result, 'phone')).toBe(false);
  });

  it('preserves Timestamp instances', () => {
    const ts = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));
    const result = omitUndefinedDeep({ createdAt: ts, note: undefined });
    expect(result.createdAt).toBe(ts);
    expect(Object.prototype.hasOwnProperty.call(result, 'note')).toBe(false);
  });
});

describe('Firestore converters toFirestore', () => {
  const baseCustomer: Customer = {
    id: 'c1',
    localId: 'c1',
    salesRepId: 'u1',
    code: 'C001',
    name: 'Test Cari',
    phone: undefined,
    email: undefined,
    contactPerson: undefined,
    taxNumber: undefined,
    address: { city: 'Ankara', district: undefined },
    isActive: true,
    isDeleted: false,
    source: 'manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedBy: 'u1',
    version: 1,
    syncStatus: 'pending',
  };

  it('customerConverter strips undefined optional fields including phone', () => {
    const payload = customerConverter.toFirestore(baseCustomer);
    expect(Object.prototype.hasOwnProperty.call(payload, 'phone')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, 'email')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, 'contactPerson')).toBe(
      false,
    );
    expect(payload.address).toEqual({ city: 'Ankara' });
    expect(payload.deletedAt).toBeNull();
    expect(payload.createdAt).toBeInstanceOf(Timestamp);
  });

  it('branchConverter strips undefined phone', () => {
    const branch: CustomerBranch = {
      id: 'b1',
      customerId: 'c1',
      name: 'Merkez',
      phone: undefined,
      address: undefined,
      contactPerson: undefined,
      isActive: true,
      isDeleted: false,
      syncStatus: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'u1',
      updatedBy: 'u1',
      version: 1,
    };

    const payload = branchConverter.toFirestore(branch);
    expect(Object.prototype.hasOwnProperty.call(payload, 'phone')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(payload, 'address')).toBe(false);
  });

  it('productConverter keeps null deletedAt and strips undefined', () => {
    const product: Product = {
      id: 'p1',
      localId: 'p1',
      sku: 'SKU1',
      name: 'Ürün',
      barcode: '123',
      category: 'Genel',
      unit: 'Adet',
      listPrice: 0,
      vatRate: 20,
      stockQuantity: 1,
      isActive: true,
      isDeleted: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'u1',
      updatedBy: 'u1',
      version: 1,
      syncStatus: 'pending',
      deletedAt: undefined,
    };

    const payload = productConverter.toFirestore(product);
    expect(payload.deletedAt).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(payload, 'phone')).toBe(false);
  });

  it('orderConverter preserves explicit null timestamp fields', () => {
    const order = {
      id: 'o1',
      localId: 'o1',
      orderNumber: 'SIP-1',
      customerId: 'c1',
      customerCode: 'C001',
      customerName: 'Test',
      salesRepId: 'u1',
      status: 'draft',
      orderSyncStatus: 'pending',
      erpSyncStatus: 'none',
      isDeleted: false,
      createdOffline: false,
      orderDate: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'u1',
      updatedBy: 'u1',
      version: 1,
      syncStatus: 'pending',
      deliveryDate: undefined,
      deletedAt: undefined,
      erpSyncedAt: undefined,
      notes: undefined,
    } as Order;

    const payload = orderConverter.toFirestore(order);
    expect(payload.deliveryDate).toBeNull();
    expect(payload.deletedAt).toBeNull();
    expect(payload.erpSyncedAt).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(payload, 'notes')).toBe(false);
  });
});
