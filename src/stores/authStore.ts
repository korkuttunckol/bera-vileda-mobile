import { create } from 'zustand';
import type { AuthUser } from '@/features/auth/types/auth.types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) =>
    { set({ user, isAuthenticated: user !== null, isLoading: false }); },
  setLoading: (isLoading) => { set({ isLoading }); },
  logout: () => { set({ user: null, isAuthenticated: false, isLoading: false }); },
}));
