import { SDK_VERSION } from 'firebase/app';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { env } from '@/config/env';
import { getFirebaseApp } from '@/shared/lib/firebase/app';
import { getFirestoreDb } from '@/shared/lib/firebase/firestore';

type UsersTestResult =
  | { status: 'loading' }
  | { status: 'success'; documentCount: number }
  | { status: 'error'; code: string; message: string; stack: string };

function formatBool(value: boolean): string {
  return value ? 'Evet' : 'Hayır';
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-brand-gray-100 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-brand-gray-500">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap break-all font-mono text-sm text-brand-navy">
        {value}
      </dd>
    </div>
  );
}

export function DiagnosticsPage() {
  const firebaseApp = getFirebaseApp();
  const firestoreDb = getFirestoreDb();
  const [usersTest, setUsersTest] = useState<UsersTestResult>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function runUsersGetDocsTest(): Promise<void> {
      if (!firestoreDb) {
        if (!cancelled) {
          setUsersTest({
            status: 'error',
            code: 'NO_FIRESTORE',
            message: 'Firestore instance oluşturulamadı.',
            stack: '',
          });
        }
        return;
      }

      try {
        const snapshot = await getDocs(collection(firestoreDb, 'users'));
        if (!cancelled) {
          setUsersTest({
            status: 'success',
            documentCount: snapshot.size,
          });
        }
      } catch (error: unknown) {
        if (cancelled) return;

        if (error instanceof Error) {
          const code =
            'code' in error && typeof error.code === 'string'
              ? error.code
              : error.name;
          setUsersTest({
            status: 'error',
            code,
            message: error.message,
            stack: error.stack ?? '',
          });
          return;
        }

        setUsersTest({
          status: 'error',
          code: 'UNKNOWN',
          message: String(error),
          stack: '',
        });
      }
    }

    void runUsersGetDocsTest();

    return () => {
      cancelled = true;
    };
  }, [firestoreDb]);

  const usersTestDisplay = (() => {
    if (usersTest.status === 'loading') {
      return 'Test çalışıyor...';
    }
    if (usersTest.status === 'success') {
      return `Başarılı — doküman sayısı: ${String(usersTest.documentCount)}`;
    }
    return [
      `Hata`,
      `error.code: ${usersTest.code}`,
      `error.message: ${usersTest.message}`,
      `stack: ${usersTest.stack || '(yok)'}`,
    ].join('\n');
  })();

  return (
    <div className="min-h-screen bg-brand-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">Tanılama</h1>
          <p className="mt-1 text-sm text-brand-gray-500">
            Firebase ve Firestore bağlantı durumu
          </p>
        </header>

        <dl className="rounded-xl border border-brand-gray-200 bg-white p-4 shadow-sm">
          <DiagnosticRow
            label="1. Firebase App başlatıldı mı?"
            value={formatBool(firebaseApp !== null)}
          />
          <DiagnosticRow
            label="2. Firebase Project ID"
            value={
              firebaseApp?.options.projectId ??
              env.VITE_FIREBASE_PROJECT_ID ??
              '(yok)'
            }
          />
          <DiagnosticRow
            label="3. Firebase App ID"
            value={
              firebaseApp?.options.appId ?? env.VITE_FIREBASE_APP_ID ?? '(yok)'
            }
          />
          <DiagnosticRow
            label="4. Firestore instance oluşturuldu mu?"
            value={formatBool(firestoreDb !== null)}
          />
          <DiagnosticRow
            label="5–6. users koleksiyonu getDocs() sonucu"
            value={usersTestDisplay}
          />
          <DiagnosticRow
            label="7. navigator.onLine"
            value={String(navigator.onLine)}
          />
          <DiagnosticRow label="8. Firebase SDK sürümü" value={SDK_VERSION} />
          <DiagnosticRow label="9. VITE_APP_ENV" value={env.VITE_APP_ENV} />
        </dl>
      </div>
    </div>
  );
}
