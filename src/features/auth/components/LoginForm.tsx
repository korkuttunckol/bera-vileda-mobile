import { useEffect, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { APP_NAME } from '@/shared/constants/app';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toastStore';

export function LoginForm() {
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      void navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      login({ username, password });
      toast('Giriş başarılı', 'success');
      void navigate(ROUTES.DASHBOARD);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Kullanıcı adı veya şifre hatalı';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) {
    return null;
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-navy">
          <span className="text-xl font-bold text-white">BV</span>
        </div>
        <h1 className="text-xl font-bold text-brand-navy">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Saha satış sipariş yönetimi
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Kullanıcı Adı"
          name="username"
          type="text"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => { setUsername(e.target.value); }}
          placeholder="admin"
        />
        <Input
          label="Şifre"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); }}
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
    </div>
  );
}
