import { FirebaseError } from 'firebase/app';

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

function formatFirebaseErrorCode(code: string): string {
  const segment = code.split('/').pop() ?? code;
  return segment.replace(/-/g, '_').toUpperCase();
}

export function getFirestoreErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const label = formatFirebaseErrorCode(error.code);
    return `${label}: ${error.message}`;
  }

  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause) {
      return getFirestoreErrorMessage(cause);
    }
    if (error.message) {
      return error.message;
    }
  }

  return 'Firestore işlemi başarısız oldu.';
}

export function logFirestoreError(context: string, error: unknown): void {
  if (error instanceof FirebaseError) {
    console.error(`[Firestore] ${context}:`, {
      code: error.code,
      message: error.message,
    });
    return;
  }

  console.error(`[Firestore] ${context}:`, error);
}

export function assertOnlineForFirestoreWrite(): void {
  if (!navigator.onLine) {
    throw new Error('Bu işlem için internet bağlantısı gerekir.');
  }
}
