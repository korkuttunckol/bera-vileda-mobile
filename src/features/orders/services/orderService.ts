import { v4 as uuidv4 } from 'uuid';
import {
  orderLocalRepository,
  filterOrdersByStatus,
  countPendingOrders,
} from '@/shared/lib/indexeddb/repositories/orderRepository';
import { syncQueueRepository } from '@/shared/lib/indexeddb/repositories/syncQueueRepository';
import { outboxProcessor } from '@/shared/lib/sync/OutboxProcessor';
import { syncService } from '@/features/sync/services/syncService';
import { calculateOrderTotals } from '@/features/orders/utils/orderCalculations';
import { isFirebaseConfigured } from '@/config/env';
import { erpAdapter } from '@/shared/lib/erp/adapters/NullErpAdapter';
import type { Order, OrderLine, OrderHistoryFilter } from '@/shared/types/order.types';
import type { OrderDraft } from '@/features/orders/types/orderFlow.types';
import { UserRole } from '@/shared/types/role.types';

interface CreateOrderParams {
  draft: OrderDraft;
  userId: string;
  userRole: UserRole;
}

class OrderService {
  async createFromDraft({
    draft,
    userId,
  }: CreateOrderParams): Promise<{ order: Order; isOffline: boolean }> {
    if (!draft.customerId || !draft.lines.length) {
      throw new Error('Müşteri ve en az bir ürün gereklidir.');
    }

    const isOffline = !navigator.onLine;
    const now = new Date().toISOString();
    const orderId = uuidv4();
    const localId = uuidv4();
    const totals = calculateOrderTotals(draft.lines);

    const order: Order = {
      id: orderId,
      localId,
      customerId: draft.customerId,
      customerName: draft.customerName ?? '',
      customerCode: draft.customerCode,
      branchId: draft.branchId,
      branchName: draft.branchName,
      salesRepId: userId,
      status: 'submitted',
      orderSyncStatus: 'pending_offline',
      orderDate: now,
      notes: draft.notes,
      subtotal: totals.subtotal,
      discountTotal: 0,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      lineCount: totals.lineCount,
      itemCount: totals.itemCount,
      createdOffline: isOffline,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      version: 1,
      syncStatus: 'pending',
      erpSyncStatus: 'none',
      localOrderNumber: `LOCAL-${localId.slice(0, 8).toUpperCase()}`,
    };

    const lines: OrderLine[] = draft.lines.map((line, index) => ({
      id: uuidv4(),
      orderId,
      productId: line.productId,
      productSku: line.productSku,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountRate: line.discountRate,
      vatRate: line.vatRate,
      lineTotal: line.lineTotal,
      sortOrder: index,
      unit: line.unit,
    }));

    await orderLocalRepository.saveWithLines(order, lines);

    if (isFirebaseConfigured()) {
      await outboxProcessor.enqueue({
        entityType: 'order',
        entityId: order.id,
        operation: 'create',
        data: { orderId: order.id, localId: order.localId },
      });
      await syncService.refreshPendingCount();
    } else {
      const erpResult = await erpAdapter.exportOrder({
        orderId: order.id,
        customerCode: order.customerCode ?? order.customerId,
        lines: lines.map((line) => ({
          productSku: line.productSku,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      });

      const now = new Date().toISOString();
      await orderLocalRepository.save({
        ...order,
        orderSyncStatus: 'sent',
        syncStatus: 'synced',
        erpSyncStatus: erpResult.success ? 'synced' : 'failed',
        erpId: erpResult.erpReferenceId,
        erpSyncError: erpResult.success ? undefined : erpResult.errorMessage,
        erpSyncedAt: erpResult.success ? now : undefined,
        updatedAt: now,
      });
      order.orderSyncStatus = 'sent';
      order.syncStatus = 'synced';
      order.erpSyncStatus = erpResult.success ? 'synced' : 'failed';
    }

    syncService.notifyDataChanged();

    if (isFirebaseConfigured() && !isOffline) {
      void syncService.syncNow('auto');
    } else {
      void syncService.publishOrderSyncReport('auto');
    }

    return { order, isOffline };
  }

  async list(
    userId: string,
    role: UserRole,
    filter: OrderHistoryFilter = 'all',
  ): Promise<Order[]> {
    const all = await orderLocalRepository.findAllForUser(
      userId,
      role === UserRole.ADMIN,
    );
    return filterOrdersByStatus(all, filter);
  }

  async getById(id: string): Promise<Order | undefined> {
    const order = await orderLocalRepository.getById(id);
    if (!order || order.isDeleted) return undefined;
    return order;
  }

  async getLines(orderId: string): Promise<OrderLine[]> {
    return orderLocalRepository.getLinesByOrderId(orderId);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await orderLocalRepository.softDelete(id, userId);
  }

  async countPending(userId: string, role: UserRole): Promise<number> {
    const all = await orderLocalRepository.findAllForUser(
      userId,
      role === UserRole.ADMIN,
    );
    return countPendingOrders(all);
  }

  async retryOrderSync(orderId: string): Promise<void> {
    const order = await orderLocalRepository.getById(orderId);
    if (!order || order.isDeleted) {
      throw new Error('Sipariş bulunamadı.');
    }

    await orderLocalRepository.updateSyncStatus(
      orderId,
      'pending_offline',
      'pending',
      undefined,
    );

    const existing = await syncQueueRepository.findByEntityId(orderId);
    if (existing) {
      await syncQueueRepository.resetToPending(existing.id, 0);
    } else {
      await outboxProcessor.enqueue({
        entityType: 'order',
        entityId: order.id,
        operation: 'create',
        data: { orderId: order.id, localId: order.localId },
      });
    }

    await syncService.refreshPendingCount();
  }
}

export const orderService = new OrderService();
