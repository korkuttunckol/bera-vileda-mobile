import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Compact control rendered beside the subtitle (e.g. order branch picker). */
  subtitleAction?: ReactNode;
  action?: ReactNode;
  backButton?: ReactNode;
  className?: string;
  variant?: 'default' | 'transparent';
  /** When false, header is not position:sticky (Yeni Sipariş pinned layout). */
  sticky?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  subtitleAction,
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
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {backButton}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-brand-navy">
              {title}
            </h1>
            {subtitle ? (
              <div className="flex min-w-0 w-full items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm text-brand-gray-500">{subtitle}</p>
                {subtitleAction ? (
                  <div className="shrink-0">{subtitleAction}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
