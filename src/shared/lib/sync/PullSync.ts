import {
  getMetaValue,
  setMetaValue,
  META_KEYS,
} from '@/shared/lib/indexeddb/db';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import {
  pullCustomersSince,
  pullProductsSince,
} from '@/shared/lib/firebase/firestoreService';
import { conflictResolver } from './ConflictResolver';
import type { SyncPullStats } from './types/sync.types';

const EPOCH = '1970-01-01T00:00:00.000Z';

export class PullSync {
  async pullAll(): Promise<SyncPullStats> {
    const stats: SyncPullStats = { customers: 0, products: 0 };

    const customerSince =
      (await getMetaValue(META_KEYS.LAST_PULL_CUSTOMERS)) ?? EPOCH;
    const productSince =
      (await getMetaValue(META_KEYS.LAST_PULL_PRODUCTS)) ?? EPOCH;

    const now = new Date().toISOString();

    const remoteCustomers = await pullCustomersSince(customerSince);
    for (const remote of remoteCustomers) {
      const normalized = {
        ...remote,
        syncStatus: 'synced' as const,
      };
      const local = await customerLocalRepository.getById(remote.id);
      if (local) {
        const { resolved } = conflictResolver.resolve(local, normalized);
        await customerLocalRepository.save(resolved);
      } else {
        await customerLocalRepository.save(normalized);
      }
      stats.customers++;
    }

    const remoteProducts = await pullProductsSince(productSince);
    for (const remote of remoteProducts) {
      const normalized = {
        ...remote,
        syncStatus: 'synced' as const,
      };
      const localById = await productLocalRepository.getById(remote.id);
      if (localById) {
        const { resolved } = conflictResolver.resolve(localById, normalized);
        await productLocalRepository.save(resolved);
      } else {
        const localBySku = await productLocalRepository.findBySku(remote.sku);
        if (localBySku) {
          const { resolved } = conflictResolver.resolve(localBySku, {
            ...normalized,
            id: localBySku.id,
            localId: localBySku.localId,
          });
          await productLocalRepository.save(resolved);
        } else {
          await productLocalRepository.save(normalized);
        }
      }
      stats.products++;
    }

    await setMetaValue(META_KEYS.LAST_PULL_CUSTOMERS, now);
    await setMetaValue(META_KEYS.LAST_PULL_PRODUCTS, now);

    return stats;
  }
}

export const pullSync = new PullSync();
