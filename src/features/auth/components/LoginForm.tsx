import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toastStore';
import { syncService } from '@/features/sync/services/syncService';
import {
  BUSINESS_UNITS,
  allowedBusinessUnits,
  type BusinessUnit,
} from '@/features/units/unitAccess';

const UNIT_ROUTES: Record<BusinessUnit, string> = {
  sales: ROUTES.DASHBOARD,
  depot: ROUTES.DEPOT,
  packaging: ROUTES.PACKAGING,
  reporting: ROUTES.REPORTING,
  management: ROUTES.MANAGEMENT,
};

export function LoginForm() {
  const { login, logout, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit>('sales');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const loginAttemptRef = useRef(false);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && !loginAttemptRef.current) {
      void navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    loginAttemptRef.current = true;

    void login({ username: userCode, password })
      .then(async (authUser) => {
        if (!allowedBusinessUnits(authUser).includes(businessUnit)) {
          logout();
          throw new Error(
            `${BUSINESS_UNITS[businessUnit].title} birimi için bu kullanıcıya erişim tanımlı değil.`,
          );
        }

        toast('Giriş başarılı', 'success');
        if (navigator.onLine) {
          try {
            await syncService.syncNow('auto');
          } catch (error) {
            console.error('[Login] Giriş sonrası senkronizasyon hatası:', error);
          }
        }
        void navigate(UNIT_ROUTES[businessUnit]);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Kullanıcı kodu veya şifre hatalı';
        setError(message);
        loginAttemptRef.current = false;
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (isAuthLoading) {
    return null;
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <img
          src="/assets/logos/bera-wordmark.jpg"
          alt="BERA"
          className="mx-auto mb-5 w-52 rounded-lg"
        />
        <p className="text-base font-medium text-brand-gray-500">
          Bera Otomasyon Yönetimi
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Kullanıcı Kodu"
          name="userCode"
          type="text"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          value={userCode}
          onChange={(event) => { setUserCode(event.target.value.toUpperCase()); }}
          placeholder="ADMIN"
        />
        <div className="w-full">
          <label htmlFor="business-unit" className="mb-1.5 block text-sm font-semibold text-brand-gray-700">
            Birim
          </label>
          <select
            id="business-unit"
            value={businessUnit}
            onChange={(event) => { setBusinessUnit(event.target.value as BusinessUnit); }}
            className="h-11 w-full rounded-xl border border-brand-gray-200 bg-white px-3.5 text-[15px] text-brand-gray-700 shadow-sm transition-all duration-150 focus:border-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-navy/15"
          >
            {(Object.keys(BUSINESS_UNITS) as BusinessUnit[]).map((unit) => (
              <option key={unit} value={unit}>{BUSINESS_UNITS[unit].title}</option>
            ))}
          </select>
        </div>
        <Input
          label="Şifre"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => { setPassword(event.target.value); }}
          placeholder="••••••"
          required
        />

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Button type="submit" fullWidth isLoading={isLoading} size="lg">
          Giriş Yap
        </Button>
      </form>

      <button
        type="button"
        onClick={() => { void navigate(ROUTES.ADMIN_LOGIN); }}
        className="ml-auto mt-6 flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-brand-gray-500 transition hover:bg-brand-gray-100 hover:text-brand-navy"
        aria-label="Yönetici ayarlarına giriş"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Ayarlar
      </button>

    </div>
  );
}
