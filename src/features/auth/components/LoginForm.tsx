import { useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { APP_NAME } from '@/shared/constants/app';
import { isDevAuthBypassEnabled } from '@/config/env';
import { toast } from '@/stores/toastStore';

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      toast('Giriş başarılı', 'success');
      void navigate('/');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Giriş yapılamadı.';
      setError(message);
      toast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

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
        {isDevAuthBypassEnabled() ? (
          <p className="mt-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            Geliştirme modu: Firebase bağlantısı yok. Herhangi bir e-posta/şifre
            ile giriş yapabilirsiniz.
          </p>
        ) : null}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Input
          label="E-posta"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); }}
          placeholder="ornek@bera.com"
          required
        />
        <Input
          label="Şifre"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); }}
          placeholder="••••••••"
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
