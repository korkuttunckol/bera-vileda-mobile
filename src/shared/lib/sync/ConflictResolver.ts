import type { BaseEntity } from '@/shared/types/base.types';

export type ConflictResolution = 'local_wins' | 'remote_wins' | 'manual';

export interface ConflictResult<T extends BaseEntity> {
  resolved: T;
  resolution: ConflictResolution;
  hadConflict: boolean;
}

export class ConflictResolver {
  resolve<T extends BaseEntity>(local: T, remote: T): ConflictResult<T> {
    if (local.version === remote.version) {
      return { resolved: local, resolution: 'local_wins', hadConflict: false };
    }

    if (local.version > remote.version) {
      return { resolved: local, resolution: 'local_wins', hadConflict: true };
    }

    return { resolved: remote, resolution: 'remote_wins', hadConflict: true };
  }

  markConflict<T extends BaseEntity>(entity: T): T {
    return { ...entity, syncStatus: 'conflict' as const };
  }
}

export const conflictResolver = new ConflictResolver();
