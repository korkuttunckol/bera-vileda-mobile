import { useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SettingsBackButton } from '@/features/settings/components/SettingsBackButton';
import { useUsers } from '@/features/users/hooks/useUsers';
import { userManagementService } from '@/features/users/services/userManagementService';
import { USER_ROLE_LABELS, UserRole } from '@/shared/types/role.types';
import { toast } from '@/stores/toastStore';
import { cn } from '@/shared/utils/cn';

export function UsersManagementPage() {
  const { users, isLoading, reload } = useUsers();
  const [isCreating, setIsCreating] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.MERCH);
  const [isSaving, setIsSaving] = useState(false);
  const [busyUserCode, setBusyUserCode] = useState<string | null>(null);

  const handleCreate = async (): Promise<void> => {
    if (!userCode.trim() || !name.trim() || !password.trim()) {
      toast('Kullanıcı kodu, ad ve şifre zorunludur.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await userManagementService.createUser({
        userCode,
        name,
        password,
        role,
      });
      toast('Kullanıcı oluşturuldu', 'success');
      setUserCode('');
      setName('');
      setPassword('');
      setRole(UserRole.MERCH);
      setIsCreating(false);
      await reload();
    } catch (err) {
      console.error('[UsersManagement] Kullanıcı oluşturma hatası:', err);
      toast(err instanceof Error ? err.message : 'Kullanıcı oluşturulamadı', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (targetUserCode: string, active: boolean): Promise<void> => {
    setBusyUserCode(targetUserCode);
    try {
      await userManagementService.setUserActive(targetUserCode, !active);
      toast(active ? 'Kullanıcı pasif yapıldı' : 'Kullanıcı aktif yapıldı', 'success');
      await reload();
    } catch (err) {
      console.error('[UsersManagement] Kullanıcı durumu güncellenemedi:', err);
      toast(err instanceof Error ? err.message : 'İşlem başarısız', 'error');
    } finally {
      setBusyUserCode(null);
    }
  };

  const handleDelete = async (targetUserCode: string): Promise<void> => {
    if (!window.confirm(`${targetUserCode} kullanıcısını silmek istediğinize emin misiniz?`)) {
      return;
    }

    setBusyUserCode(targetUserCode);
    try {
      await userManagementService.deleteUser(targetUserCode);
      toast('Kullanıcı silindi', 'success');
      await reload();
    } catch (err) {
      console.error('[UsersManagement] Kullanıcı silme hatası:', err);
      toast(err instanceof Error ? err.message : 'Kullanıcı silinemedi', 'error');
    } finally {
      setBusyUserCode(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Kullanıcı Yönetimi"
        subtitle="Admin kullanıcıları oluşturun ve yönetin"
        backButton={<SettingsBackButton />}
      />

      <div className="page-content space-y-4">
        <Card padding="md">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-brand-gray-600">
              Sistemde yalnızca Admin ve Merch rolleri kullanılır.
            </p>
            <Button size="sm" onClick={() => { setIsCreating((value) => !value); }}>
              {isCreating ? 'İptal' : 'Yeni Kullanıcı'}
            </Button>
          </div>
        </Card>

        {isCreating ? (
          <Card padding="md" className="space-y-3">
            <Input
              label="Kullanıcı Kodu"
              value={userCode}
              onChange={(event) => { setUserCode(event.target.value.toUpperCase()); }}
              placeholder="MERCH04"
            />
            <Input
              label="Ad Soyad"
              value={name}
              onChange={(event) => { setName(event.target.value); }}
            />
            <Input
              label="Şifre"
              type="password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); }}
            />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-brand-navy">Rol</span>
              <select
                className="w-full rounded-xl border border-brand-gray-200 px-3 py-2.5"
                value={role}
                onChange={(event) => { setRole(event.target.value as UserRole); }}
              >
                <option value={UserRole.ADMIN}>{USER_ROLE_LABELS[UserRole.ADMIN]}</option>
                <option value={UserRole.MERCH}>{USER_ROLE_LABELS[UserRole.MERCH]}</option>
              </select>
            </label>
            <Button fullWidth isLoading={isSaving} onClick={() => void handleCreate()}>
              Kullanıcı Oluştur
            </Button>
          </Card>
        ) : null}

        {isLoading ? (
          <LoadingSpinner label="Kullanıcılar yükleniyor..." />
        ) : users.length === 0 ? (
          <EmptyState title="Kullanıcı bulunamadı" description="Yeni kullanıcı ekleyebilirsiniz." />
        ) : (
          <div className="space-y-2.5">
            {users.map((user) => (
              <Card key={user.id} padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-navy">{user.userCode}</p>
                    <p className="text-sm text-brand-gray-600">{user.name}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">
                      {USER_ROLE_LABELS[user.role]}
                      {' · '}
                      {user.active ? 'Aktif' : 'Pasif'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={busyUserCode === user.userCode}
                      disabled={busyUserCode !== null && busyUserCode !== user.userCode}
                      onClick={() => void handleToggleActive(user.userCode, user.active)}
                    >
                      {user.active ? 'Pasif Yap' : 'Aktif Yap'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(user.userCode === 'ADMIN' && 'opacity-50')}
                      disabled={user.userCode === 'ADMIN' || (busyUserCode !== null && busyUserCode !== user.userCode)}
                      isLoading={busyUserCode === user.userCode}
                      onClick={() => void handleDelete(user.userCode)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
