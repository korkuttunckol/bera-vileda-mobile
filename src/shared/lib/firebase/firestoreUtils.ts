import { enableNetwork, type Firestore } from 'firebase/firestore';

const DEFAULT_TIMEOUT_MS = 12_000;

export function isFirestoreOfflineError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('offline') ||
    message.includes('client is offline') ||
    message.includes('failed to get document') ||
    message.includes('unavailable')
  );
}

export function getFirestoreErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes('zaman aşımı')) {
    return error.message;
  }
  if (isFirestoreOfflineError(error)) {
    return 'Firestore bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Firestore işlemi başarısız oldu.';
}

export async function withFirestoreTimeout<T>(
  promise: Promise<T>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error('Firestore işlemi zaman aşımına uğradı. Bağlantınızı kontrol edin.'));
      }, timeoutMs);
    }),
  ]);
}

export async function ensureFirestoreOnline(db: Firestore): Promise<void> {
  try {
    await enableNetwork(db);
  } catch {
    // Ağ zaten açıksa veya offline modda sessizce devam et.
  }
}

export function assertOnlineForFirestoreWrite(): void {
  if (!navigator.onLine) {
    throw new Error('Bu işlem için internet bağlantısı gerekir.');
  }
}
