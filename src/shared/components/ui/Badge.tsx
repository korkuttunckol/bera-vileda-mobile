import { cn } from '@/shared/utils/cn';

type BadgeVariant = 'active' | 'passive' | 'pending' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  active: 'bg-green-100 text-green-800',
  passive: 'bg-brand-gray-200 text-brand-gray-600',
  pending: 'bg-amber-50 text-amber-900',
  default: 'bg-brand-gray-100 text-brand-navy',
};

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
        variantStyles[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
