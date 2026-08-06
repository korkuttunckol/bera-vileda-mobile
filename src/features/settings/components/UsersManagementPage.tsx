import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import {
  ActiveFilter,
  type ActiveFilterValue,
} from '@/shared/components/form/ActiveFilter';
import { SettingsBackButton } from '@/features/settings/components/SettingsBackButton';
import { UserCard } from '@/features/users/components/UserCard';
import { UserRoleFilterControl } from '@/features/users/components/UserRoleFilter';
import { useUsers } from '@/features/users/hooks/useUsers';
import { ROUTES } from '@/shared/constants/routes';
import type { UserRoleFilter } from '@/shared/types/user.types';

export function UsersManagementPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all');
  const { users, isLoading } = useUsers(activeFilter, roleFilter);

  return (
    <div>
      <PageHeader
        title="Kullanıcı Yönetimi"
        subtitle="Admin ve Merch kullanıcılarını yönetin"
        backButton={<SettingsBackButton />}
        action={
          <Button
            size="sm"
            onClick={() => void navigate(ROUTES.SETTINGS_USER_NEW)}
          >
            + Yeni
          </Button>
        }
      />

      <div className="page-content space-y-3">
        <div className="space-y-2">
          <p className="section-label">Durum</p>
          <ActiveFilter value={activeFilter} onChange={setActiveFilter} />
        </div>
        <div className="space-y-2">
          <p className="section-label">Rol</p>
          <UserRoleFilterControl value={roleFilter} onChange={setRoleFilter} />
        </div>

        {isLoading ? (
          <LoadingSpinner label="Kullanıcılar yükleniyor..." />
        ) : users.length === 0 ? (
          <EmptyState
            title="Kullanıcı bulunamadı"
            description="Filtrelere uyan kullanıcı yok. Yeni kullanıcı ekleyebilirsiniz."
            action={
              <Button onClick={() => void navigate(ROUTES.SETTINGS_USER_NEW)}>
                + Yeni Kullanıcı
              </Button>
            }
          />
        ) : (
          <div className="list-stack">
            <p className="section-label">{users.length} kullanıcı</p>
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onSelect={() =>
                  void navigate(
                    ROUTES.SETTINGS_USER_EDIT.replace(':userCode', user.userCode),
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
