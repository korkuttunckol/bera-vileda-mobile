import {
  getAuth,
  type Auth,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { getFirebaseApp } from './app';

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;

  auth ??= getAuth(app);
  void setPersistence(auth, browserLocalPersistence);
  return auth;
}
