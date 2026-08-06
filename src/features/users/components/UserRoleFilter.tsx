import { cn } from '@/shared/utils/cn';
import type { UserRoleFilter } from '@/shared/types/user.types';

interface UserRoleFilterProps {
  value: UserRoleFilter;
  onChange: (value: UserRoleFilter) => void;
}

const OPTIONS: { value: UserRoleFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'admin', label: 'Admin' },
  { value: 'merch', label: 'Merch' },
];

export function UserRoleFilterControl({ value, onChange }: UserRoleFilterProps) {
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
