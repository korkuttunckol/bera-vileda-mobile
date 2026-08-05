import { useCallback, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';

interface MobileQtyStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Compact (−)[n](+) with ≥48px touch targets and numeric keyboard input. */
export function MobileQtyStepper({
  value,
  onChange,
  min = 0,
  max = 99999,
  className,
}: MobileQtyStepperProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = useCallback((): void => {
    const parsed = parseInt(draft, 10);
    if (draft === '' || Number.isNaN(parsed)) {
      onChange(min);
    } else {
      onChange(clamp(parsed, min, max));
    }
    setIsEditing(false);
  }, [draft, max, min, onChange]);

  const startEdit = (): void => {
    setIsEditing(true);
    setDraft(String(value));
    window.setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  return (
    <div className={cn('inline-flex shrink-0 items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => {
          if (value > min) onChange(value - 1);
        }}
        disabled={value <= min}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          'border border-brand-gray-200 bg-white text-xl font-bold text-brand-navy',
          'active:scale-95 active:bg-brand-gray-100 disabled:opacity-35',
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
        enterKeyHint="done"
        autoComplete="off"
        value={isEditing ? draft : String(value)}
        onFocus={startEdit}
        onClick={startEdit}
        onChange={(e) => {
          setDraft(e.target.value.replace(/\D/g, ''));
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className={cn(
          'h-12 w-14 rounded-xl border border-brand-gray-200 bg-white text-center',
          'text-base font-bold text-brand-navy',
          'focus:border-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-navy/15',
        )}
        aria-label="Adet"
      />
      <button
        type="button"
        onClick={() => {
          if (value < max) onChange(value + 1);
        }}
        disabled={value >= max}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          'border border-brand-gray-200 bg-brand-navy text-xl font-bold text-white',
          'active:scale-95 active:bg-brand-navy-dark disabled:opacity-35',
        )}
        aria-label="Artır"
      >
        +
      </button>
    </div>
  );
}
