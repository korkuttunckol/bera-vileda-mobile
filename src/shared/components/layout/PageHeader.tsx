import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  backButton?: ReactNode;
  className?: string;
  variant?: 'default' | 'transparent';
  /** Default true. Set false when the page owns a pinned flex layout (Yeni Sipariş). */
  sticky?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  action,
  backButton,
  className,
  variant = 'default',
  sticky = true,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'z-30 w-full min-w-0 px-4 py-4',
        sticky && 'sticky top-0',
        variant === 'default' &&
          'border-b border-brand-gray-200/80 bg-white/95 backdrop-blur-md',
        variant === 'transparent' && 'bg-transparent',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {backButton}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-brand-navy">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-sm text-brand-gray-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
