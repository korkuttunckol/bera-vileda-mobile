import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-y-auto overscroll-y-contain bg-brand-gray-50">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <Outlet />
      </main>
      <footer className="pb-6 text-center text-xs text-brand-gray-400">
        <p>BERA YÖNETİM v.2.00</p>
        <p className="mt-1 text-[11px]">Korkut TUNÇKOL - 2026</p>
      </footer>
    </div>
  );
}
