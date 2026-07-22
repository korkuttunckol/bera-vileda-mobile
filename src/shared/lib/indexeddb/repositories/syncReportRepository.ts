import { db, type LocalSyncReport } from '../db';

class SyncReportRepository {
  async save(report: LocalSyncReport): Promise<void> {
    await db.syncReports.put(report);
  }

  async getLatest(): Promise<LocalSyncReport | undefined> {
    const reports = await db.syncReports
      .orderBy('startedAt')
      .reverse()
      .limit(1)
      .toArray();
    return reports[0];
  }

  async getById(id: string): Promise<LocalSyncReport | undefined> {
    return db.syncReports.get(id);
  }

  async getRecent(limit = 10): Promise<LocalSyncReport[]> {
    return db.syncReports.orderBy('startedAt').reverse().limit(limit).toArray();
  }
}

export const syncReportRepository = new SyncReportRepository();
