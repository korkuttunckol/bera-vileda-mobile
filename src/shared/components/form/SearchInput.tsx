import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-brand-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={ref}
        value={value}
        className={cn(
          'h-11 w-full rounded-xl border border-brand-gray-200/90 bg-white pl-10 pr-10 text-[15px] shadow-sm',
          'placeholder:text-brand-gray-400',
          'transition-all duration-150',
          'focus:border-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-navy/15',
          className,
        )}
        {...props}
      />
      {value && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-brand-gray-400 transition-colors hover:bg-brand-gray-100 hover:text-brand-gray-600 active:scale-95"
          aria-label="Temizle"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  ),
);

SearchInput.displayName = 'SearchInput';
