type SyncCollection = 'Customers' | 'Products' | 'Users';

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function logSyncStarted(): void {
  console.info('[Sync] Synchronization started');
}

export function logSyncCollectionStarted(collection: SyncCollection): void {
  console.info(`[Sync] ${collection} started`);
}

export function logSyncCollectionCompleted(
  collection: SyncCollection,
  count: number,
  durationMs: number,
): void {
  console.info(
    `[Sync] ${collection} completed (${String(count)} kayıt, ${String(durationMs)} ms)`,
  );
}

export function logSyncCollectionFailed(
  collection: SyncCollection,
  error: unknown,
  durationMs: number,
): void {
  console.error(
    `[Sync] ${collection} failed (${String(durationMs)} ms):`,
    formatError(error),
  );
}

export function logSyncCompleted(): void {
  console.info('[Sync] Synchronization completed');
}

export function logSyncFailed(error: unknown): void {
  console.error('[Sync] Synchronization failed:', formatError(error));
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
