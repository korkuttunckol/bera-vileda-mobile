type SyncCollection = 'Customers' | 'Products' | 'Users';

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function beginSyncStep(step: string): (detail?: string) => void {
  const startedAt = Date.now();
  console.info(`[Sync] ${step} started`);

  return (detail = '') => {
    const durationMs = Date.now() - startedAt;
    const suffix = detail ? ` · ${detail}` : '';
    console.info(`[Sync] ${step} finished (${String(durationMs)} ms)${suffix}`);
  };
}

export function logSyncStarted(mode: 'full' | 'incremental'): void {
  console.info(`[Sync] Sync started (${mode}, getDocs — onSnapshot kullanılmıyor)`);
}

export function logSyncCollectionStarted(collection: SyncCollection): void {
  console.info(`[Sync] ${collection} fetch started`);
}

export function logSyncCollectionCompleted(
  collection: SyncCollection,
  count: number,
  durationMs: number,
): void {
  console.info(
    `[Sync] ${collection} fetch finished (${String(durationMs)} ms) · ${String(count)} kayıt`,
  );
}

export function logSyncCollectionFailed(
  collection: SyncCollection,
  error: unknown,
  durationMs: number,
): void {
  console.error(
    `[Sync] ${collection} fetch failed (${String(durationMs)} ms):`,
    formatError(error),
  );
}

export function logSyncCompleted(totalMs?: number): void {
  if (totalMs !== undefined) {
    console.info(`[Sync] Sync completed (toplam ${String(totalMs)} ms)`);
    return;
  }
  console.info('[Sync] Sync completed');
}

export function logSyncFailed(error: unknown): void {
  console.error('[Sync] Sync failed:', formatError(error));
}

export async function runLoggedCollectionPull<T>(
  collection: SyncCollection,
  pull: () => Promise<T>,
  countOf: (result: T) => number,
): Promise<T> {
  logSyncCollectionStarted(collection);
  const startedAt = Date.now();

  try {
    const result = await pull();
    logSyncCollectionCompleted(collection, countOf(result), Date.now() - startedAt);
    return result;
  } catch (error) {
    logSyncCollectionFailed(collection, error, Date.now() - startedAt);
    throw error;
  }
}

export function wrapCollectionError(
  collection: SyncCollection,
  error: unknown,
): Error {
  const detail = formatError(error);
  return new Error(`${collection}: ${detail}`);
}
