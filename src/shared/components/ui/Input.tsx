import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-semibold text-brand-gray-700"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 w-full rounded-xl border bg-white px-3.5 text-[15px] text-brand-gray-700 shadow-sm',
            'placeholder:text-brand-gray-400',
            'transition-all duration-150',
            'focus:border-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-navy/15',
            error ? 'border-red-500' : 'border-brand-gray-200',
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        ) : null}
        {hint && !error ? (
          <p className="mt-1.5 text-sm text-brand-gray-400">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
