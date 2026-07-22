import type { ReactElement, SVGAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export type IconName =
  | 'orders'
  | 'pending'
  | 'customers'
  | 'products'
  | 'new-order'
  | 'history'
  | 'sync'
  | 'chevron-right';

interface IconProps extends SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-7 w-7',
};

const paths: Record<IconName, ReactElement> = {
  orders: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  ),
  pending: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  customers: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
    />
  ),
  products: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  ),
  'new-order': (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  ),
  history: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  sync: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  ),
  'chevron-right': (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  ),
};

export function Icon({ name, size = 'md', className, ...props }: IconProps) {
  return (
    <svg
      className={cn(sizeMap[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
