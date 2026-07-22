import { cn } from '@/shared/utils/cn';

export type ActiveFilterValue = 'all' | 'active' | 'passive';

interface ActiveFilterProps {
  value: ActiveFilterValue;
  onChange: (value: ActiveFilterValue) => void;
}

const OPTIONS: { value: ActiveFilterValue; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'passive', label: 'Pasif' },
];

export function ActiveFilter({ value, onChange }: ActiveFilterProps) {
  return (
    <div className="flex gap-1.5 rounded-xl bg-brand-gray-100/80 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { onChange(opt.value); }}
          className={cn(
            'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98]',
            value === opt.value
              ? 'bg-white text-brand-navy shadow-sm ring-1 ring-brand-navy/10'
              : 'text-brand-gray-500 hover:text-brand-navy',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
