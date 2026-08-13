import { db, type LocalOrder, type LocalOrderLine } from '../db';
import { BaseRepository } from './baseRepository';
import type { SyncStatus } from '@/shared/types/base.types';
import type {
  OrderHistoryFilter,
  OrderSyncStatus,
} from '@/shared/types/order.types';

class OrderLocalRepository extends BaseRepository<LocalOrder> {
  protected tableName = 'orders';

  async getById(id: string): Promise<LocalOrder | undefined> {
    return db.orders.get(id);
  }

  async getAll(): Promise<LocalOrder[]> {
    return db.orders.toArray();
  }

  async save(entity: LocalOrder): Promise<void> {
    await db.orders.put(entity);
  }

  delete(_id: string): Promise<void> {
    return Promise.reject(new Error('Fiziksel silme yasaktır. softDelete kullanın.'));
  }

  async softDelete(id: string, updatedBy: string): Promise<void> {
    const order = await this.getById(id);
    if (!order) return;
    await this.save({
      ...order,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedBy,
      updatedAt: new Date().toISOString(),
      version: order.version + 1,
    });
  }

  async findBySyncStatus(status: SyncStatus): Promise<LocalOrder[]> {
    return db.orders.where('syncStatus').equals(status).toArray();
  }

  async findByLocalId(localId: string): Promise<LocalOrder | undefined> {
    return db.orders.where('localId').equals(localId).first();
  }

  async findBySalesRepId(salesRepId: string): Promise<LocalOrder[]> {
    return db.orders
      .where('salesRepId')
      .equals(salesRepId)
      .filter((o) => !o.isDeleted)
      .toArray();
  }

  /**
   * Non-admin visibility: only orders this user created.
   * Missing/empty createdBy → excluded (legacy rows stay admin-only).
   * createdBy is not an IndexedDB index; filter scan is intentional.
   */
  async findByCreatedBy(createdBy: string): Promise<LocalOrder[]> {
    return db.orders
      .filter(
        (o) =>
          !o.isDeleted &&
          typeof o.createdBy === 'string' &&
          o.createdBy === createdBy,
      )
      .toArray();
  }

  async findAllForUser(
    userId: string,
    isAdmin: boolean,
  ): Promise<LocalOrder[]> {
    if (isAdmin) {
      return db.orders.filter((o) => !o.isDeleted).toArray();
    }
    return this.findByCreatedBy(userId);
  }

  async updateSyncStatus(
    id: string,
    orderSyncStatus: OrderSyncStatus,
    syncStatus: SyncStatus,
    syncError?: string,
  ): Promise<void> {
    const order = await this.getById(id);
    if (!order) return;
    await this.save({
      ...order,
      orderSyncStatus,
      syncStatus,
      syncError,
      updatedAt: new Date().toISOString(),
    });
  }

  async getLinesByOrderId(orderId: string): Promise<LocalOrderLine[]> {
    return db.orderLines.where('orderId').equals(orderId).toArray();
  }

  async saveLines(lines: LocalOrderLine[]): Promise<void> {
    await db.orderLines.bulkPut(lines);
  }

  async saveWithLines(
    order: LocalOrder,
    lines: LocalOrderLine[],
  ): Promise<void> {
    await db.transaction('rw', [db.orders, db.orderLines], async () => {
      await db.orders.put(order);
      await db.orderLines.bulkPut(lines);
    });
  }

  /**
   * Upsert order by id and replace all local lines for that orderId.
   * Used by Admin Firestore order pull so stale lines are not left behind.
   */
  async replaceWithLines(
    order: LocalOrder,
    lines: LocalOrderLine[],
  ): Promise<void> {
    await db.transaction('rw', [db.orders, db.orderLines], async () => {
      await db.orderLines.where('orderId').equals(order.id).delete();
      await db.orders.put(order);
      if (lines.length > 0) {
        await db.orderLines.bulkPut(lines);
      }
    });
  }
}

export const orderLocalRepository = new OrderLocalRepository();

export function filterOrdersByStatus(
  orders: LocalOrder[],
  filter: OrderHistoryFilter,
): LocalOrder[] {
  let result = orders.filter((o) => !o.isDeleted);

  switch (filter) {
    case 'pending':
      // Align with countPendingOrders: waiting + failed need attention.
      result = result.filter(
        (o) =>
          o.orderSyncStatus === 'pending_offline' ||
          o.orderSyncStatus === 'sending' ||
          o.orderSyncStatus === 'failed',
      );
      break;
    case 'sent':
      result = result.filter((o) => o.orderSyncStatus === 'sent');
      break;
    case 'failed':
      result = result.filter((o) => o.orderSyncStatus === 'failed');
      break;
    case 'all':
      break;
  }

  return result.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function countPendingOrders(orders: LocalOrder[]): number {
  return orders.filter(
    (o) =>
      !o.isDeleted &&
      (o.orderSyncStatus === 'pending_offline' ||
        o.orderSyncStatus === 'failed'),
  ).length;
}
