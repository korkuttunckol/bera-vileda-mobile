import { useCallback, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';

interface NumericQuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

function clampQuantity(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
  const focusValueRef = useRef(String(value));
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const selectAll = useCallback((): void => {
    const input = inputRef.current;
    if (!input) return;
    input.select();
    window.setTimeout(() => {
      input.select();
    }, 0);
  }, []);

  const commitDraft = useCallback((): void => {
    const parsed = parseInt(draft, 10);
    if (draft === '' || Number.isNaN(parsed)) {
      onChange(min);
    } else {
      onChange(clampQuantity(parsed, min, max));
    }
    setIsEditing(false);
  }, [draft, max, min, onChange]);

  const decrement = (): void => {
    if (value > min) onChange(value - 1);
  };

  const increment = (): void => {
    if (value < max) onChange(value + 1);
  };

  const handleFocus = useCallback((): void => {
    const nextDraft = String(value);
    focusValueRef.current = nextDraft;
    setIsEditing(true);
    setDraft(nextDraft);
    selectAll();
  }, [selectAll, value]);

  const handleClick = useCallback((): void => {
    if (isEditing) {
      selectAll();
    }
  }, [isEditing, selectAll]);

  const handleTouchEnd = useCallback((): void => {
    selectAll();
  }, [selectAll]);

  const handleInputChange = (raw: string): void => {
    setDraft(raw.replace(/\D/g, ''));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      inputRef.current?.blur();
      return;
    }

    if (event.key.length !== 1 || !/\d/.test(event.key)) {
      return;
    }

    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;
    const hasFullSelection =
      selectionStart === 0 && selectionEnd === input.value.length;
    const cursorAtEndWithoutSelection =
      selectionStart === selectionEnd && selectionEnd === input.value.length;

    if (
      isEditing &&
      draft === focusValueRef.current &&
      (hasFullSelection || cursorAtEndWithoutSelection)
    ) {
      event.preventDefault();
      setDraft(event.key);
    }
  };

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
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={isEditing ? draft : String(value)}
        onChange={(event) => { handleInputChange(event.target.value); }}
        onFocus={handleFocus}
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
        onBlur={commitDraft}
        onKeyDown={handleKeyDown}
        className={cn(
          'rounded-xl border border-brand-gray-200 bg-white text-center font-semibold text-brand-navy shadow-sm',
          'focus:border-brand-navy/35 focus:outline-none focus:ring-[3px] focus:ring-brand-navy/12',
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
