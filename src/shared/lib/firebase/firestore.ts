import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseApp } from './app';

let firestore: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;

  firestore ??= getFirestore(app);
  return firestore;
}
