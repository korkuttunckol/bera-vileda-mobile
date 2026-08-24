import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { clearOrderDraftForUserChange } from '@/features/orders/hooks/useOrderDraftPersist';
import { authService } from '../services/authService';
import type { AuthUser, LoginCredentials } from '../types/auth.types';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const logoutStore = useAuthStore((s) => s.logout);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = authService.onAuthStateChange(setUser);
    return unsubscribe;
  }, [setUser, setLoading]);

  const login = async (credentials: LoginCredentials): Promise<AuthUser> => {
    const authUser = await authService.login(credentials);
    // Sipariş taslağı kullanıcıya özeldir; önceki kullanıcının müşterisi ve
    // kalemleri yeni oturuma asla taşınmamalıdır.
    clearOrderDraftForUserChange();
    setUser(authUser);
    return authUser;
  };

  const logout = (): void => {
    clearOrderDraftForUserChange();
    authService.logout();
    logoutStore();
  };

  return { user, isLoading, isAuthenticated, login, logout };
}
