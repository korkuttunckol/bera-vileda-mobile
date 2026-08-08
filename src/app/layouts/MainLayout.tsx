import { Outlet, useNavigate } from 'react-router-dom';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { OfflineBanner } from '@/shared/components/offline/OfflineBanner';
import { ToastContainer } from '@/shared/components/feedback/Toast';
import { APP_SHORT_NAME } from '@/shared/constants/app';
import { ROUTES } from '@/shared/constants/routes';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePermissions } from '@/features/auth/hooks/usePermissions';

export function MainLayout() {
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();

  const handleSettingsClick = (): void => {
    void navigate(can('systemSettings') ? ROUTES.SETTINGS : ROUTES.SETTINGS_APP_INFO);
  };

  const handleLogout = (): void => {
    logout();
    void navigate(ROUTES.LOGIN);
  };

  return (
    <div className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-brand-surface">
      <header className="safe-area-top z-30 shrink-0 border-b border-white/10 bg-gradient-to-r from-brand-navy via-brand-navy-light to-brand-navy-dark px-4 py-3 shadow-sm">
        <div className="app-shell flex items-center justify-between gap-2">
          <div>
            <p className="text-[15px] font-bold tracking-tight text-white">
              {APP_SHORT_NAME}
            </p>
            {user ? (
              <p className="text-xs text-white/70">{user.displayName}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSettingsClick}
              className="touch-feedback rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Ayarlar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="touch-feedback rounded-xl px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <div className="shrink-0">
        <OfflineBanner />
      </div>

      {/* Single vertical scroll owner for all authenticated pages (Android + iOS). */}
      <main className="app-shell min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain pb-20 page-enter">
        <Outlet />
      </main>

      <BottomNav />
      <ToastContainer />
    </div>
  );
}
