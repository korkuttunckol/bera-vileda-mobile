import { useEffect, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { ROUTES } from '@/shared/constants/routes';
import { UserRole } from '@/shared/types/role.types';

export function AdminLoginForm() {
  const { login, logout, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      void navigate(ROUTES.SETTINGS_USERS, { replace: true });
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    void login({ username: userCode, password })
      .then((authUser) => {
        if (authUser.role !== UserRole.ADMIN) {
          logout();
          throw new Error('Bu alan yalnızca ADMIN kullanıcısı içindir.');
        }
        void navigate(ROUTES.SETTINGS_USERS, { replace: true });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Kullanıcı kodu veya şifre hatalı');
      })
      .finally(() => { setIsLoading(false); });
  };

  if (isAuthLoading) return null;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <img src="/assets/logos/bera-wordmark.jpg" alt="BERA" className="mx-auto mb-5 w-44 rounded-lg" />
        <h1 className="text-xl font-bold text-brand-navy">Giriş ayarları</h1>
        <p className="mt-1 text-sm text-brand-gray-500">Kullanıcı ve birim yetkileri</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Yönetici Kullanıcı Kodu"
          type="text"
          autoComplete="username"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          value={userCode}
          onChange={(event) => { setUserCode(event.target.value.toUpperCase()); }}
          placeholder="ADMIN"
        />
        <Input
          label="Şifre"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => { setPassword(event.target.value); }}
          placeholder="••••••"
          required
        />
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <Button type="submit" fullWidth isLoading={isLoading} size="lg">Ayarlar’a Gir</Button>
        <Button type="button" variant="ghost" fullWidth onClick={() => { void navigate(ROUTES.LOGIN); }}>
          Geri
        </Button>
      </form>
    </div>
  );
}
