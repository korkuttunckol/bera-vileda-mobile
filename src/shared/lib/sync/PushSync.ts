import { orderLocalRepository } from '@/shared/lib/indexeddb/repositories/orderRepository';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { branchLocalRepository } from '@/shared/lib/indexeddb/repositories/branchRepository';
import {
  pushOrderToFirestore,
  pushCustomerToFirestore,
  pushBranchToFirestore,
} from '@/shared/lib/firebase/firestoreService';
import { erpAdapter } from '@/shared/lib/erp/adapters/NullErpAdapter';
import { isFirebaseConfigured } from '@/config/env';
import { idempotencyGuard } from './IdempotencyGuard';
import type { LocalSyncQueueItem } from '@/shared/lib/indexeddb/db';
import type { SyncReportError } from './types/sync.types';

export type PushItemResult =
  | { status: 'synced' }
  | { status: 'skipped' }
  | { status: 'failed'; error: SyncReportError };

export class PushSync {
  async pushItem(item: LocalSyncQueueItem): Promise<PushItemResult> {
    const shouldSkip = await idempotencyGuard.shouldSkip(
      item.idempotencyKey,
      item.entityId,
    );
    if (shouldSkip) {
      if (item.entityType === 'order') {
        await orderLocalRepository.updateSyncStatus(
          item.entityId,
          'sent',
          'synced',
        );
      }
      return { status: 'skipped' };
    }

    try {
      switch (item.entityType) {
        case 'order':
          await this.pushOrder(item);
          break;
        case 'customer':
          await this.pushCustomer(item);
          break;
        case 'branch':
          await this.pushBranch(item);
          break;
        case 'product':
          break;
      }

      await idempotencyGuard.markProcessed(item.idempotencyKey);
      return { status: 'synced' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      return {
        status: 'failed',
        error: {
          entityType: item.entityType,
          entityId: item.entityId,
          idempotencyKey: item.idempotencyKey,
          message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async pushOrder(item: LocalSyncQueueItem): Promise<void> {
    const order = await orderLocalRepository.getById(item.entityId);
    if (!order) {
      throw new Error(`Sipariş bulunamadı: ${item.entityId}`);
    }

    await orderLocalRepository.updateSyncStatus(
      order.id,
      'sending',
      'pending',
    );

    try {
      const lines = await orderLocalRepository.getLinesByOrderId(order.id);
      if (isFirebaseConfigured()) {
        await pushOrderToFirestore(order, lines);
      }

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
        syncError: undefined,
        erpSyncStatus: erpResult.success ? 'synced' : 'failed',
        erpId: erpResult.erpReferenceId,
        erpSyncError: erpResult.success ? undefined : erpResult.errorMessage,
        erpSyncedAt: erpResult.success ? now : undefined,
        updatedAt: now,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gönderim hatası';
      await orderLocalRepository.updateSyncStatus(
        order.id,
        'failed',
        'failed',
        message,
      );
      throw err;
    }
  }

  private async pushCustomer(item: LocalSyncQueueItem): Promise<void> {
    const customer = await customerLocalRepository.getById(item.entityId);
    if (!customer) {
      throw new Error(`Müşteri bulunamadı: ${item.entityId}`);
    }

    await pushCustomerToFirestore(customer);
    await customerLocalRepository.save({
      ...customer,
      syncStatus: 'synced',
      updatedAt: new Date().toISOString(),
    });
  }

  private async pushBranch(item: LocalSyncQueueItem): Promise<void> {
    const branch = await branchLocalRepository.getById(item.entityId);
    if (!branch) {
      throw new Error(`Şube bulunamadı: ${item.entityId}`);
    }

    await pushBranchToFirestore(branch);
    await branchLocalRepository.save({
      ...branch,
      syncStatus: 'synced',
      updatedAt: new Date().toISOString(),
    });
  }
}

export const pushSync = new PushSync();
