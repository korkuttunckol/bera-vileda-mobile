import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth } from '@/shared/lib/firebase/auth';
import { getFirestoreDb } from '@/shared/lib/firebase/firestore';
import { UserRole } from '@/shared/types/role.types';
import { isDevAuthBypassEnabled, isFirebaseConfigured } from '@/config/env';
import type { AuthUser, LoginCredentials } from '../types/auth.types';
import {
  createDevAuthUser,
  disableDevAuthSession,
  enableDevAuthSession,
  getDevAuthUser,
} from './devAuthBypass';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    if (isDevAuthBypassEnabled()) {
      enableDevAuthSession();
      return createDevAuthUser(credentials);
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error(
        'Firebase yapılandırması eksik. .env dosyasını kontrol edin.',
      );
    }

    const credential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password,
    );

    const user = await this.mapFirebaseUser(credential.user);
    if (!user) {
      throw new Error('Kullanıcı profili bulunamadı.');
    }

    return user;
  }

  async logout(): Promise<void> {
    if (isDevAuthBypassEnabled()) {
      disableDevAuthSession();
      return;
    }

    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    if (isDevAuthBypassEnabled()) {
      callback(getDevAuthUser());
      return () => undefined;
    }

    const auth = getFirebaseAuth();

    if (!auth || !isFirebaseConfigured()) {
      callback(null);
      return () => undefined;
    }

    return onAuthStateChanged(auth, (firebaseUser) => {
      void this.mapFirebaseUser(firebaseUser).then(callback);
    });
  }

  private async mapFirebaseUser(
    firebaseUser: User | null,
  ): Promise<AuthUser | null> {
    if (!firebaseUser) return null;

    const db = getFirestoreDb();
    let role = UserRole.SALES_REP;
    let displayName = firebaseUser.displayName ?? firebaseUser.email ?? '';

    if (db) {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as { role?: UserRole; displayName?: string };
        role = data.role ?? UserRole.SALES_REP;
        displayName = data.displayName ?? displayName;
      }
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      displayName,
      role,
    };
  }
}

export const authService = new AuthService();
