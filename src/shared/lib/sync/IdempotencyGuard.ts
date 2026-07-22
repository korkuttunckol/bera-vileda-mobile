import {
  isIdempotencyKeyProcessed,
  markIdempotencyKeyProcessed,
} from '@/shared/lib/indexeddb/db';
import { syncQueueRepository } from '@/shared/lib/indexeddb/repositories/syncQueueRepository';
import { orderLocalRepository } from '@/shared/lib/indexeddb/repositories/orderRepository';
import { findOrderByLocalId } from '@/shared/lib/firebase/firestoreService';
import type { Order } from '@/shared/types/order.types';

export class IdempotencyGuard {
  async shouldSkip(idempotencyKey: string, entityId: string): Promise<boolean> {
    if (await isIdempotencyKeyProcessed(idempotencyKey)) {
      return true;
    }

    const queueItem =
      await syncQueueRepository.findByIdempotencyKey(idempotencyKey);
    if (queueItem?.status === 'processing') {
      return true;
    }

    const order = await orderLocalRepository.getById(entityId);
    if (
      order?.syncStatus === 'synced' ||
      order?.orderSyncStatus === 'sent'
    ) {
      await markIdempotencyKeyProcessed(idempotencyKey);
      return true;
    }

    if (order?.localId) {
      const remote = await findOrderByLocalId(order.localId);
      if (remote) {
        await this.reconcileLocalOrder(order, remote);
        await markIdempotencyKeyProcessed(idempotencyKey);
        return true;
      }
    }

    return false;
  }

  async markProcessed(idempotencyKey: string): Promise<void> {
    await markIdempotencyKeyProcessed(idempotencyKey);
  }

  private async reconcileLocalOrder(local: Order, remote: Order): Promise<void> {
    await orderLocalRepository.save({
      ...local,
      id: remote.id,
      syncStatus: 'synced',
      orderSyncStatus: 'sent',
      updatedAt: new Date().toISOString(),
    });
  }
}

export const idempotencyGuard = new IdempotencyGuard();

export function buildIdempotencyKey(
  entityType: string,
  entityId: string,
  operation: string,
): string {
  return `${entityType}:${entityId}:${operation}`;
}
