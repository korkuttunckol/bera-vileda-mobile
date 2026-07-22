import { useCallback, useRef } from 'react';
import { cn } from '@/shared/utils/cn';

interface NumericQuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function NumericQuantityInput({
  value,
  onChange,
  min = 1,
  max = 99999,
  size = 'md',
  className,
}: NumericQuantityInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const decrement = (): void => {
    if (value > min) onChange(value - 1);
  };

  const increment = (): void => {
    if (value < max) onChange(value + 1);
  };

  const handleInputChange = (raw: string): void => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    onChange(Math.min(max, Math.max(min, parsed)));
  };

  const handleFocus = useCallback(() => {
    inputRef.current?.select();
  }, []);

  const btnSize = size === 'sm' ? 'h-9 w-9 text-base' : 'h-11 w-11 text-lg';
  const inputSize = size === 'sm' ? 'h-9 w-12 text-sm' : 'h-11 w-14 text-base';

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        className={cn(
          'flex items-center justify-center rounded-xl border border-brand-gray-200 bg-white font-bold text-brand-navy shadow-sm',
          'transition-all active:scale-95 active:bg-brand-gray-100 disabled:opacity-40',
          btnSize,
        )}
        aria-label="Azalt"
      >
        −
      </button>
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min={min}
        max={max}
        value={value}
        onChange={(e) => { handleInputChange(e.target.value); }}
        onFocus={handleFocus}
        className={cn(
          'rounded-xl border border-brand-gray-200 bg-white text-center font-semibold text-brand-navy shadow-sm',
          'focus:border-brand-navy/35 focus:outline-none focus:ring-[3px] focus:ring-brand-navy/12',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          inputSize,
        )}
      />
      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        className={cn(
          'flex items-center justify-center rounded-xl border border-brand-gray-200 bg-white font-bold text-brand-navy shadow-sm',
          'transition-all active:scale-95 active:bg-brand-gray-100 disabled:opacity-40',
          btnSize,
        )}
        aria-label="Artır"
      >
        +
      </button>
    </div>
  );
}
