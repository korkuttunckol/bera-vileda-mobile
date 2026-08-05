import { db, type LocalSyncQueueItem } from '../db';

class SyncQueueRepository {
  async enqueue(item: LocalSyncQueueItem): Promise<void> {
    const existing = await db.syncQueue
      .where('idempotencyKey')
      .equals(item.idempotencyKey)
      .first();

    if (existing) {
      if (existing.status === 'failed') {
        await db.syncQueue.update(existing.id, {
          ...item,
          id: existing.id,
          status: 'pending',
          retryCount: 0,
        });
      }
      return;
    }

    await db.syncQueue.put(item);
  }

  async getPending(): Promise<LocalSyncQueueItem[]> {
    return db.syncQueue
      .where('status')
      .equals('pending')
      .sortBy('createdAt');
  }

  async getFailed(): Promise<LocalSyncQueueItem[]> {
    return db.syncQueue.where('status').equals('failed').toArray();
  }

  async markProcessing(id: string): Promise<void> {
    await db.syncQueue.update(id, {
      status: 'processing',
      lastAttemptAt: new Date().toISOString(),
    });
  }

  async markFailed(id: string, retryCount: number): Promise<void> {
    await db.syncQueue.update(id, {
      status: 'failed',
      retryCount,
      lastAttemptAt: new Date().toISOString(),
    });
  }

  async resetToPending(id: string, retryCount: number): Promise<void> {
    await db.syncQueue.update(id, {
      status: 'pending',
      retryCount,
      lastAttemptAt: new Date().toISOString(),
    });
  }

  async remove(id: string): Promise<void> {
    await db.syncQueue.delete(id);
  }

  async countPending(): Promise<number> {
    return db.syncQueue.where('status').anyOf(['pending', 'failed']).count();
  }

  async findByIdempotencyKey(
    key: string,
  ): Promise<LocalSyncQueueItem | undefined> {
    return db.syncQueue.where('idempotencyKey').equals(key).first();
  }

  /**
   * Aynı idempotencyKey ile processing durumunda olan BAŞKA bir kuyruk kaydı var mı?
   * Mevcut item kendi kendini "processing" diye skip etmesin diye excludeItemId hariç tutulur.
   */
  async findOtherProcessingByIdempotencyKey(
    key: string,
    excludeItemId: string,
  ): Promise<LocalSyncQueueItem | undefined> {
    const item = await this.findByIdempotencyKey(key);
    if (
      item &&
      item.status === 'processing' &&
      item.id !== excludeItemId
    ) {
      return item;
    }
    return undefined;
  }

  async findByEntityId(
    entityId: string,
  ): Promise<LocalSyncQueueItem | undefined> {
    return db.syncQueue.where('entityId').equals(entityId).first();
  }
}

export const syncQueueRepository = new SyncQueueRepository();
