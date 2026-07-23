import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '../services/authService';
import type { LoginCredentials } from '../types/auth.types';

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

  const login = (credentials: LoginCredentials): void => {
    const authUser = authService.login(credentials);
    setUser(authUser);
  };

  const logout = (): void => {
    authService.logout();
    logoutStore();
  };

  return { user, isLoading, isAuthenticated, login, logout };
}
