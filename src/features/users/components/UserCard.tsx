import { USER_ROLE_LABELS } from '@/shared/types/role.types';
import type { AppUserPublic } from '@/shared/types/user.types';
import { cn, formatDate } from '@/shared/utils/cn';

interface UserCardProps {
  user: AppUserPublic;
  onSelect: () => void;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="touch-feedback w-full rounded-2xl border border-brand-gray-200/80 bg-white px-4 py-3.5 text-left shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-brand-navy">{user.userCode}</p>
          <p className="truncate text-sm text-brand-gray-600">{user.name}</p>
          <p className="mt-1 text-xs text-brand-gray-500">
            {USER_ROLE_LABELS[user.role]}
            {' · '}
            Son güncelleme: {formatUpdatedAt(user.updatedAt)}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold',
            user.active
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
          )}
        >
          {user.active ? 'Aktif' : 'Pasif'}
        </span>
      </div>
    </button>
  );
}
