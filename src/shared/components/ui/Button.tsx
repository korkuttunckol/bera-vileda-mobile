import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-navy text-white shadow-sm hover:bg-brand-navy-dark active:bg-brand-navy-dark',
  secondary:
    'bg-brand-gray-100 text-brand-navy hover:bg-brand-gray-200 active:bg-brand-gray-200',
  outline:
    'border border-brand-gray-200 bg-white text-brand-navy shadow-sm hover:bg-brand-gray-50 active:bg-brand-gray-100',
  ghost: 'text-brand-navy hover:bg-brand-gray-100 active:bg-brand-gray-200',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-xl px-3.5 text-sm',
  md: 'h-11 rounded-xl px-4 text-[15px]',
  lg: 'h-12 rounded-xl px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled ?? isLoading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.97]',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
