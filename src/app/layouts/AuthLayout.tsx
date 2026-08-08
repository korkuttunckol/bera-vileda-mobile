import { Outlet } from 'react-router-dom';
import { APP_NAME, APP_VERSION } from '@/shared/constants/app';

export function AuthLayout() {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-y-auto overscroll-y-contain bg-brand-gray-50">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <Outlet />
      </main>
      <footer className="pb-6 text-center text-xs text-brand-gray-400">
        {APP_NAME} v{APP_VERSION}
      </footer>
    </div>
  );
}
