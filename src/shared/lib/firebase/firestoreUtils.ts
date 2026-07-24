import { enableNetwork, type Firestore } from 'firebase/firestore';

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
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Firestore işlemi başarısız oldu.';
}

let networkPreparePromise: Promise<void> | null = null;

/** Tek seferlik, zaman aşımısız ağ hazırlığı. Başarısız olursa okuma yine denenir. */
export async function prepareFirestoreNetwork(db: Firestore): Promise<void> {
  if (!networkPreparePromise) {
    networkPreparePromise = (async () => {
      try {
        await enableNetwork(db);
        console.info('[Sync] Firestore ağ bağlantısı hazır');
      } catch (error) {
        if (isFirestoreOfflineError(error)) {
          console.warn('[Sync] Firestore ağ bağlantısı kurulamadı:', error);
        }
        networkPreparePromise = null;
      }
    })();
  }

  await networkPreparePromise;
}

export function resetFirestoreNetworkPrepare(): void {
  networkPreparePromise = null;
}

export function assertOnlineForFirestoreWrite(): void {
  if (!navigator.onLine) {
    throw new Error('Bu işlem için internet bağlantısı gerekir.');
  }
}
