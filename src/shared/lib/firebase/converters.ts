import {
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  Timestamp,
} from 'firebase/firestore';
import type { Order, OrderLine } from '@/shared/types/order.types';
import type { Customer, CustomerBranch } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';

function toIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
}

function toTimestamp(value: string): Timestamp {
  return Timestamp.fromDate(new Date(value));
}

/**
 * Firestore rejects `undefined` field values. Strip them recursively while
 * preserving `null` (used for cleared timestamps) and non-plain values
 * (Timestamp, Date, etc.).
 */
export function omitUndefinedDeep<T>(value: T): T {
  if (value === undefined || value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Timestamp || value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    const cleaned: unknown[] = [];
    for (const item of value) {
      if (item === undefined) continue;
      cleaned.push(omitUndefinedDeep(item));
    }
    return cleaned as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry === undefined) continue;
    result[key] = omitUndefinedDeep(entry);
  }
  return result as T;
}

export const orderConverter: FirestoreDataConverter<Order> = {
  toFirestore(order: Order) {
    return omitUndefinedDeep({
      ...order,
      createdAt: toTimestamp(order.createdAt),
      updatedAt: toTimestamp(order.updatedAt),
      orderDate: toTimestamp(order.orderDate),
      deliveryDate: order.deliveryDate
        ? toTimestamp(order.deliveryDate)
        : null,
      deletedAt: order.deletedAt ? toTimestamp(order.deletedAt) : null,
      erpSyncedAt: order.erpSyncedAt ? toTimestamp(order.erpSyncedAt) : null,
    });
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): Order {
    const data = snapshot.data(options) as Record<string, unknown>;
    return {
      ...(data as unknown as Order),
      id: snapshot.id,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
      orderDate: toIso(data.orderDate),
      deliveryDate: data.deliveryDate ? toIso(data.deliveryDate) : undefined,
      deletedAt: data.deletedAt ? toIso(data.deletedAt) : undefined,
      erpSyncedAt: data.erpSyncedAt ? toIso(data.erpSyncedAt) : undefined,
      orderSyncStatus:
        (data.orderSyncStatus as Order['orderSyncStatus'] | undefined) ??
        'sent',
      isDeleted: (data.isDeleted as boolean | undefined) ?? false,
      customerName: (data.customerName as string | undefined) ?? '',
    };
  },
};

export const orderLineConverter: FirestoreDataConverter<OrderLine> = {
  toFirestore(line: OrderLine) {
    return omitUndefinedDeep({ ...line });
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): OrderLine {
    const data = snapshot.data(options) as OrderLine;
    return { ...data, id: snapshot.id };
  },
};

export const customerConverter: FirestoreDataConverter<Customer> = {
  toFirestore(customer: Customer) {
    return omitUndefinedDeep({
      ...customer,
      createdAt: toTimestamp(customer.createdAt),
      updatedAt: toTimestamp(customer.updatedAt),
      deletedAt: customer.deletedAt ? toTimestamp(customer.deletedAt) : null,
    });
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): Customer {
    const data = snapshot.data(options) as Record<string, unknown>;
    return {
      ...(data as unknown as Customer),
      id: snapshot.id,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
      deletedAt: data.deletedAt ? toIso(data.deletedAt) : undefined,
      isActive: (data.isActive as boolean | undefined) ?? true,
      isDeleted: (data.isDeleted as boolean | undefined) ?? false,
      source: (data.source as Customer['source'] | undefined) ?? 'excel',
    };
  },
};

export const branchConverter: FirestoreDataConverter<CustomerBranch> = {
  toFirestore(branch: CustomerBranch) {
    return omitUndefinedDeep({ ...branch });
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): CustomerBranch {
    const data = snapshot.data(options) as Record<string, unknown>;
    return {
      ...(data as unknown as CustomerBranch),
      id: snapshot.id,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
      isActive: (data.isActive as boolean | undefined) ?? true,
      isDeleted: (data.isDeleted as boolean | undefined) ?? false,
      syncStatus:
        (data.syncStatus as CustomerBranch['syncStatus'] | undefined) ??
        'synced',
    };
  },
};

export const productConverter: FirestoreDataConverter<Product> = {
  toFirestore(product: Product) {
    return omitUndefinedDeep({
      ...product,
      createdAt: toTimestamp(product.createdAt),
      updatedAt: toTimestamp(product.updatedAt),
      deletedAt: product.deletedAt ? toTimestamp(product.deletedAt) : null,
    });
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): Product {
    const data = snapshot.data(options) as Record<string, unknown>;
    return {
      ...(data as unknown as Product),
      id: snapshot.id,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
      deletedAt: data.deletedAt ? toIso(data.deletedAt) : undefined,
      stockQuantity: (data.stockQuantity as number | undefined) ?? 0,
      isDeleted: (data.isDeleted as boolean | undefined) ?? false,
    };
  },
};
