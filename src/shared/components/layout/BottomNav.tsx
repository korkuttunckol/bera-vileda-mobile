import { type ReactElement } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { NAV_ITEMS, type NavIcon } from '@/shared/constants/app';
import { useVisualViewportKeyboard } from '@/shared/hooks/useVisualViewportKeyboard';
import { cn } from '@/shared/utils/cn';

function NavIconSvg({ icon, active }: { icon: NavIcon; active: boolean }) {
  const color = active ? 'text-brand-navy' : 'text-brand-gray-400';

  const icons: Record<NavIcon, ReactElement> = {
    home: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
    plus: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    ),
    users: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
    box: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    ),
    history: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    settings: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z"
      />
    ),
  };

  return (
    <svg
      className={cn('h-[22px] w-[22px]', color)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {icons[icon]}
    </svg>
  );
}

export function BottomNav() {
  const location = useLocation();
  const { can } = usePermissions();
  const { keyboardOpen } = useVisualViewportKeyboard();

  const primaryNav = NAV_ITEMS.filter((item) => {
    if (!['/', '/orders/new', '/customers', '/products', '/orders'].includes(item.path)) {
      return false;
    }
    if (item.path === '/customers') {
      return can('manageCustomers');
    }
    if (item.path === '/products') {
      return can('manageProducts');
    }
    return true;
  });

  return (
    <nav
      className={cn(
        'safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-brand-gray-200/80 bg-white/95 shadow-nav backdrop-blur-md transition-transform duration-200 ease-out',
        keyboardOpen && 'pointer-events-none translate-y-full opacity-0',
      )}
      aria-hidden={keyboardOpen}
    >
      <div className="app-shell flex min-w-0 items-stretch justify-around">
        {primaryNav.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              tabIndex={keyboardOpen ? -1 : undefined}
              className="touch-feedback flex flex-1 flex-col items-center gap-0.5 py-2.5"
            >
              <span
                className={cn(
                  'flex h-8 w-10 items-center justify-center rounded-xl transition-colors',
                  isActive && 'bg-brand-navy/8',
                )}
              >
                <NavIconSvg icon={item.icon} active={isActive} />
              </span>
              <span
                className={cn(
                  'max-w-[4.5rem] truncate text-center text-[10px] font-semibold',
                  isActive ? 'text-brand-navy' : 'text-brand-gray-400',
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
