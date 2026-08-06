import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseApp } from './app';

let firestore: Firestore | null = null;

/**
 * Shared Firestore instance for the whole app.
 * ignoreUndefinedProperties: SDK-level root fix so optional fields
 * (phone, taxNumber, address, notes, …) never throw on setDoc/batch.set.
 */
export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;

  if (!firestore) {
    try {
      firestore = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
      });
    } catch {
      // Already initialized elsewhere — reuse the existing instance.
      firestore = getFirestore(app);
    }
  }

  return firestore;
}
