import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const paddingStyles = {
  none: '',
  sm: 'p-3.5',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  padding = 'md',
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-brand-gray-200/80 bg-white shadow-card',
        'transition-all duration-200 ease-out',
        interactive &&
          'cursor-pointer hover:shadow-card-hover active:scale-[0.99] active:bg-brand-gray-50/60',
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-2">
      <div>
        <h3 className="text-[17px] font-semibold tracking-tight text-brand-navy">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-brand-gray-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
