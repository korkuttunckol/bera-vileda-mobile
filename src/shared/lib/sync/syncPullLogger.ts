function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function logSyncStart(): void {
  console.info('[Sync] SYNC START');
}

export function logSyncComplete(): void {
  console.info('[Sync] SYNC COMPLETE');
}

export function logSyncFailed(error: unknown): void {
  console.error('[Sync] SYNC FAILED:', formatError(error));
}

export function logUsersFetchStart(): void {
  console.info('[Sync] USERS FETCH START');
}

export function logUsersFetchEnd(durationMs: number, count?: number): void {
  const detail = count !== undefined ? ` (${String(count)} kayıt)` : '';
  console.info(`[Sync] USERS FETCH END (${String(durationMs)} ms)${detail}`);
}

export function logCustomersFetchStart(): void {
  console.info('[Sync] CUSTOMERS FETCH START');
}

export function logCustomersFetchEnd(durationMs: number, count?: number): void {
  const detail = count !== undefined ? ` (${String(count)} kayıt)` : '';
  console.info(`[Sync] CUSTOMERS FETCH END (${String(durationMs)} ms)${detail}`);
}

export function logProductsFetchStart(): void {
  console.info('[Sync] PRODUCTS FETCH START');
}

export function logProductsFetchEnd(durationMs: number, count?: number): void {
  const detail = count !== undefined ? ` (${String(count)} kayıt)` : '';
  console.info(`[Sync] PRODUCTS FETCH END (${String(durationMs)} ms)${detail}`);
}

export function logBranchesFetchStart(): void {
  console.info('[Sync] BRANCHES FETCH START');
}

export function logBranchesFetchEnd(durationMs: number, count?: number): void {
  const detail = count !== undefined ? ` (${String(count)} kayıt)` : '';
  console.info(`[Sync] BRANCHES FETCH END (${String(durationMs)} ms)${detail}`);
}

export function logIndexedDbWriteStart(): void {
  console.info('[Sync] INDEXEDDB WRITE START');
}

export function logIndexedDbWriteEnd(durationMs: number, detail = ''): void {
  const suffix = detail ? ` · ${detail}` : '';
  console.info(`[Sync] INDEXEDDB WRITE END (${String(durationMs)} ms)${suffix}`);
}

export function logSyncingState(isSyncing: boolean, reason: string): void {
  console.info(`[Sync] isSyncing=${String(isSyncing)} (${reason})`);
}

export async function runTimedFetch<T>(
  startLog: () => void,
  endLog: (durationMs: number, count?: number) => void,
  pull: () => Promise<T>,
  countOf: (result: T) => number,
): Promise<T> {
  startLog();
  const startedAt = Date.now();

  try {
    const result = await pull();
    endLog(Date.now() - startedAt, countOf(result));
    return result;
  } catch (error) {
    console.error(
      `[Sync] FETCH FAILED (${String(Date.now() - startedAt)} ms):`,
      formatError(error),
    );
    throw error;
  }
}

export function wrapCollectionError(label: string, error: unknown): Error {
  return new Error(`${label}: ${formatError(error)}`);
}
