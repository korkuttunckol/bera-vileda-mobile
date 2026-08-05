import {
  isIdempotencyKeyProcessed,
  markIdempotencyKeyProcessed,
} from '@/shared/lib/indexeddb/db';
import { syncQueueRepository } from '@/shared/lib/indexeddb/repositories/syncQueueRepository';
import { orderLocalRepository } from '@/shared/lib/indexeddb/repositories/orderRepository';
import { findOrderByLocalId } from '@/shared/lib/firebase/firestoreService';
import type { Order } from '@/shared/types/order.types';

export interface IdempotencySkipOptions {
  /** İşlenmekte olan kuyruk kaydının id'si — self-skip engeli için zorunlu */
  currentQueueItemId: string;
}

export class IdempotencyGuard {
  async shouldSkip(
    idempotencyKey: string,
    entityId: string,
    options: IdempotencySkipOptions,
  ): Promise<boolean> {
    if (await isIdempotencyKeyProcessed(idempotencyKey)) {
      return true;
    }

    // Yalnızca BAŞKA bir kuyruk öğesi processing ise skip et.
    // OutboxProcessor kendi item'ını processing yaptıktan sonra push ettiği için
    // aynı id ile processing görünmesi self-skip sayılmaz (idempotency korunur).
    const conflicting = await syncQueueRepository.findOtherProcessingByIdempotencyKey(
      idempotencyKey,
      options.currentQueueItemId,
    );
    if (conflicting) {
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
