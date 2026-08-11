import { db, type LocalBranch } from '../db';
import type { SyncStatus } from '@/shared/types/base.types';

class BranchLocalRepository {
  async getById(id: string): Promise<LocalBranch | undefined> {
    return db.branches.get(id);
  }

  async getAll(): Promise<LocalBranch[]> {
    return db.branches.toArray();
  }

  async findByCustomerId(customerId: string): Promise<LocalBranch[]> {
    return db.branches
      .where('customerId')
      .equals(customerId)
      .filter((b) => !b.isDeleted)
      .toArray();
  }

  async findByCustomerIdSorted(customerId: string): Promise<LocalBranch[]> {
    const branches = await this.findByCustomerId(customerId);
    return branches.sort((a, b) =>
      a.name.localeCompare(b.name, 'tr-TR', { sensitivity: 'base' }),
    );
  }

  async save(entity: LocalBranch): Promise<void> {
    await db.branches.put(entity);
  }

  async saveMany(entities: LocalBranch[]): Promise<void> {
    await db.branches.bulkPut(entities);
  }

  async softDelete(id: string, updatedBy: string): Promise<void> {
    const branch = await this.getById(id);
    if (!branch) return;
    await this.save({
      ...branch,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
      updatedBy,
      syncStatus: 'pending',
      version: branch.version + 1,
    });
  }

  async findBySyncStatus(status: SyncStatus): Promise<LocalBranch[]> {
    return db.branches.where('syncStatus').equals(status).toArray();
  }
}

export const branchLocalRepository = new BranchLocalRepository();

export function filterBranches(
  branches: LocalBranch[],
  options: { search?: string; activeFilter?: 'all' | 'active' | 'passive' },
): LocalBranch[] {
  let result = branches.filter((b) => !b.isDeleted);

  if (options.activeFilter === 'active') {
    result = result.filter((b) => b.isActive);
  } else if (options.activeFilter === 'passive') {
    result = result.filter((b) => !b.isActive);
  }

  if (options.search?.trim()) {
    const term = options.search.trim().toLocaleLowerCase('tr-TR');
    result = result.filter((b) =>
      b.name.toLocaleLowerCase('tr-TR').includes(term),
    );
  }

  return result.sort((a, b) =>
    a.name.localeCompare(b.name, 'tr-TR', { sensitivity: 'base' }),
  );
}
