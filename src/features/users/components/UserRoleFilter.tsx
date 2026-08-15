import { cn } from '@/shared/utils/cn';
import type { UserRoleFilter } from '@/shared/types/user.types';
import { USER_ROLE_LABELS, UserRole } from '@/shared/types/role.types';

interface UserRoleFilterProps {
  value: UserRoleFilter;
  onChange: (value: UserRoleFilter) => void;
}

const OPTIONS: { value: UserRoleFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'admin', label: USER_ROLE_LABELS[UserRole.ADMIN] },
  { value: 'salesRep', label: USER_ROLE_LABELS[UserRole.SALES_REP] },
  { value: 'merch', label: USER_ROLE_LABELS[UserRole.MERCH] },
];

export function UserRoleFilterControl({ value, onChange }: UserRoleFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl bg-brand-gray-100/80 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { onChange(opt.value); }}
          className={cn(
            'min-w-[4.5rem] flex-1 rounded-lg px-2 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98]',
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
