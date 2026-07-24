import { SDK_VERSION } from 'firebase/app';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { env } from '@/config/env';
import { getFirebaseApp } from '@/shared/lib/firebase/app';
import { getFirestoreDb } from '@/shared/lib/firebase/firestore';

type TestAResult =
  | { status: 'loading' }
  | { status: 'success'; documentExists: boolean; durationMs: number }
  | { status: 'timeout' }
  | { status: 'error'; code: string; message: string };

type UsersTestResult =
  | { status: 'pending' }
  | { status: 'loading' }
  | { status: 'success'; documentCount: number }
  | { status: 'timeout' }
  | { status: 'error'; code: string; message: string; stack: string };

type CollectionGetDocsResult =
  | { status: 'pending' }
  | { status: 'loading' }
  | { status: 'success'; documentCount: number; durationMs: number }
  | { status: 'error'; code: string; message: string };

const GETDOCS_TIMEOUT_MS = 5000;
const GETDOC_TIMEOUT_MS = 5000;

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

function formatTestADisplay(result: TestAResult): string {
  const header = ['TEST A', 'getDoc(users/ADMIN)', '- başladı'];

  if (result.status === 'loading') {
    return header.join('\n');
  }

  if (result.status === 'success') {
    return [
      ...header,
      '- başarılı',
      `- document exists: ${String(result.documentExists)}`,
      `- süre (ms): ${String(result.durationMs)}`,
    ].join('\n');
  }

  if (result.status === 'timeout') {
    return [...header, '- TIMEOUT'].join('\n');
  }

  return [
    ...header,
    `- error.code: ${result.code}`,
    `- error.message: ${result.message}`,
  ].join('\n');
}

function formatCollectionGetDocsDisplay(
  label: string,
  result: CollectionGetDocsResult,
): string {
  if (result.status === 'pending') {
    return `${label}\nBekleniyor...`;
  }
  if (result.status === 'loading') {
    return `${label}\nTest çalışıyor...`;
  }
  if (result.status === 'success') {
    return [
      label,
      `- doküman sayısı: ${String(result.documentCount)}`,
      `- süre (ms): ${String(result.durationMs)}`,
    ].join('\n');
  }
  return [
    label,
    `- error.code: ${result.code}`,
    `- error.message: ${result.message}`,
  ].join('\n');
}

function getErrorDetails(error: unknown): { code: string; message: string } {
  if (error instanceof Error) {
    const code =
      'code' in error && typeof error.code === 'string' ? error.code : error.name;
    return { code, message: error.message };
  }
  return { code: 'UNKNOWN', message: String(error) };
}

export function DiagnosticsPage() {
  const firebaseApp = getFirebaseApp();
  const firestoreDb = getFirestoreDb();
  const [testA, setTestA] = useState<TestAResult>({ status: 'loading' });
  const [usersTest, setUsersTest] = useState<UsersTestResult>({
    status: 'pending',
  });
  const [customersTest, setCustomersTest] = useState<CollectionGetDocsResult>({
    status: 'pending',
  });
  const [productsTest, setProductsTest] = useState<CollectionGetDocsResult>({
    status: 'pending',
  });

  useEffect(() => {
    const lifecycle = { cancelled: false };
    let getDocsTimeoutId: number | undefined;

    async function runTestA(db: NonNullable<ReturnType<typeof getFirestoreDb>>): Promise<void> {
      setTestA({ status: 'loading' });
      const startedAt = performance.now();

      try {
        const ref = doc(db, 'users', 'ADMIN');
        const result = await Promise.race([
          getDoc(ref),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error('TIMEOUT 5000'));
            }, GETDOC_TIMEOUT_MS);
          }),
        ]);

        if (lifecycle.cancelled) return;

        setTestA({
          status: 'success',
          documentExists: result.exists(),
          durationMs: Math.round(performance.now() - startedAt),
        });
      } catch (error: unknown) {
        if (lifecycle.cancelled) return;

        if (error instanceof Error && error.message === 'TIMEOUT 5000') {
          setTestA({ status: 'timeout' });
          return;
        }

        if (error instanceof Error) {
          const code =
            'code' in error && typeof error.code === 'string'
              ? error.code
              : error.name;
          setTestA({
            status: 'error',
            code,
            message: error.message,
          });
          return;
        }

        setTestA({
          status: 'error',
          code: 'UNKNOWN',
          message: String(error),
        });
      }
    }

    async function runUsersGetDocsTest(
      db: NonNullable<ReturnType<typeof getFirestoreDb>>,
    ): Promise<void> {
      setUsersTest({ status: 'loading' });

      console.log('GETDOCS START');

      const timeoutState = { timedOut: false };
      getDocsTimeoutId = window.setTimeout(() => {
        timeoutState.timedOut = true;
        console.log('GETDOCS TIMEOUT');
        if (!lifecycle.cancelled) {
          setUsersTest({ status: 'timeout' });
        }
      }, GETDOCS_TIMEOUT_MS);

      try {
        const snapshot = await getDocs(collection(db, 'users'));
        window.clearTimeout(getDocsTimeoutId);

        if (timeoutState.timedOut || lifecycle.cancelled) return;

        console.log('GETDOCS SUCCESS', snapshot.size);
        setUsersTest({
          status: 'success',
          documentCount: snapshot.size,
        });
      } catch (error: unknown) {
        window.clearTimeout(getDocsTimeoutId);

        if (timeoutState.timedOut || lifecycle.cancelled) return;

        if (error instanceof Error) {
          const code =
            'code' in error && typeof error.code === 'string'
              ? error.code
              : error.name;
          const message = error.message;
          const stack = error.stack ?? '';

          console.log(code);
          console.log(message);
          console.log(stack);

          setUsersTest({
            status: 'error',
            code,
            message,
            stack,
          });
          return;
        }

        const message = String(error);
        console.log('UNKNOWN');
        console.log(message);
        console.log('');

        setUsersTest({
          status: 'error',
          code: 'UNKNOWN',
          message,
          stack: '',
        });
      }
    }

    async function runCollectionGetDocsTest(
      db: NonNullable<ReturnType<typeof getFirestoreDb>>,
      collectionName: string,
      setResult: (result: CollectionGetDocsResult) => void,
    ): Promise<void> {
      setResult({ status: 'loading' });
      const startedAt = performance.now();

      try {
        const snapshot = await getDocs(collection(db, collectionName));

        if (lifecycle.cancelled) return;

        setResult({
          status: 'success',
          documentCount: snapshot.size,
          durationMs: Math.round(performance.now() - startedAt),
        });
      } catch (error: unknown) {
        if (lifecycle.cancelled) return;

        const { code, message } = getErrorDetails(error);
        setResult({ status: 'error', code, message });
      }
    }

    async function runAllTests(): Promise<void> {
      if (!firestoreDb) {
        if (!lifecycle.cancelled) {
          const noFirestoreError = {
            status: 'error' as const,
            code: 'NO_FIRESTORE',
            message: 'Firestore instance oluşturulamadı.',
          };
          setTestA(noFirestoreError);
          setUsersTest({
            ...noFirestoreError,
            stack: '',
          });
          setCustomersTest(noFirestoreError);
          setProductsTest(noFirestoreError);
        }
        return;
      }

      await runTestA(firestoreDb);
      await runUsersGetDocsTest(firestoreDb);
      await runCollectionGetDocsTest(firestoreDb, 'customers', setCustomersTest);
      await runCollectionGetDocsTest(firestoreDb, 'products', setProductsTest);
    }

    void runAllTests();

    return () => {
      lifecycle.cancelled = true;
      if (getDocsTimeoutId !== undefined) {
        window.clearTimeout(getDocsTimeoutId);
      }
    };
  }, [firestoreDb]);

  const usersTestDisplay = (() => {
    if (usersTest.status === 'pending') {
      return 'TEST B — getDocs(users) bekleniyor...';
    }
    if (usersTest.status === 'loading') {
      return 'TEST B — getDocs(users)\nTest çalışıyor...';
    }
    if (usersTest.status === 'timeout') {
      return 'TEST B — getDocs(users)\nGETDOCS TIMEOUT — 5 saniye içinde yanıt alınamadı.';
    }
    if (usersTest.status === 'success') {
      return `TEST B — getDocs(users)\nGETDOCS SUCCESS — doküman sayısı: ${String(usersTest.documentCount)}`;
    }
    return [
      'TEST B — getDocs(users)',
      'Hata',
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
              firebaseApp?.options.projectId ||
              env.VITE_FIREBASE_PROJECT_ID ||
              '(yok)'
            }
          />
          <DiagnosticRow
            label="3. Firebase App ID"
            value={
              firebaseApp?.options.appId || env.VITE_FIREBASE_APP_ID || '(yok)'
            }
          />
          <DiagnosticRow
            label="4. Firestore instance oluşturuldu mu?"
            value={formatBool(firestoreDb !== null)}
          />
          <DiagnosticRow
            label="TEST A — getDoc(users/ADMIN)"
            value={formatTestADisplay(testA)}
          />
          <DiagnosticRow
            label="TEST B — getDocs(users)"
            value={usersTestDisplay}
          />
          <DiagnosticRow
            label="TEST C — getDocs(customers)"
            value={formatCollectionGetDocsDisplay(
              'getDocs(customers)',
              customersTest,
            )}
          />
          <DiagnosticRow
            label="TEST D — getDocs(products)"
            value={formatCollectionGetDocsDisplay(
              'getDocs(products)',
              productsTest,
            )}
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
