import { db } from '../db';
import type { ImportReport } from '@/shared/types/import.types';

class ImportLogRepository {
  async save(report: ImportReport): Promise<void> {
    await db.importLogs.put(report);
  }

  async getLatest(): Promise<ImportReport | undefined> {
    const logs = await db.importLogs.orderBy('startedAt').reverse().limit(1).toArray();
    return logs[0];
  }

  async getRecent(limit = 20): Promise<ImportReport[]> {
    return db.importLogs.orderBy('startedAt').reverse().limit(limit).toArray();
  }

  async getById(id: string): Promise<ImportReport | undefined> {
    return db.importLogs.get(id);
  }

  async getByType(type: ImportReport['type']): Promise<ImportReport[]> {
    return db.importLogs
      .where('type')
      .equals(type)
      .reverse()
      .sortBy('startedAt');
  }
}

export const importLogRepository = new ImportLogRepository();
