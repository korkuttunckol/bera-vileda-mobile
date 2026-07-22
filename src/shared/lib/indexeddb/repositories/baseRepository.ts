import type { SyncStatus } from '@/shared/types/base.types';

export interface IRepository<T extends { id: string }> {
  getById(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
  findBySyncStatus(status: SyncStatus): Promise<T[]>;
}

export abstract class BaseRepository<T extends { id: string; syncStatus: SyncStatus }>
  implements IRepository<T>
{
  protected abstract tableName: string;

  abstract getById(id: string): Promise<T | undefined>;
  abstract getAll(): Promise<T[]>;
  abstract save(entity: T): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract findBySyncStatus(status: SyncStatus): Promise<T[]>;
}
