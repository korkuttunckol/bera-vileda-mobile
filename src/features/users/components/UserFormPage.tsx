import { useEffect, useState, type SubmitEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { ConfirmDialog } from '@/shared/components/ui/Modal';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { toast } from '@/stores/toastStore';
import { userManagementService } from '../services/userManagementService';
import { useUser } from '../hooks/useUser';
import {
  userFormSchema,
  userPasswordSchema,
  type UserFormValues,
} from '@/shared/types/user.schema';
import { USER_ROLE_LABELS, UserRole } from '@/shared/types/role.types';
import { ROUTES } from '@/shared/constants/routes';
import { normalizeUserCode } from '@/shared/types/user.types';

const EMPTY: UserFormValues = {
  userCode: '',
  name: '',
  phone: '',
  email: '',
  description: '',
  role: UserRole.MERCH,
  active: true,
  password: '',
  salesRepCodesText: '',
  merchCustomerPatternsText: '',
  merchCustomerCodesText: '',
  merchStockGroupCodesText: '',
};

export function UserFormPage() {
  const { userCode: routeUserCode } = useParams<{ userCode: string }>();
  const isEdit = Boolean(routeUserCode);
  const navigate = useNavigate();
  const { user, isLoading } = useUser(routeUserCode);
  const [form, setForm] = useState<UserFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormValues, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isEdit && user && !initialized) {
      setForm(userManagementService.toFormDefaults(user));
      setInitialized(true);
    }
  }, [isEdit, user, initialized]);

  const updateField = <K extends keyof UserFormValues>(
    key: K,
    value: UserFormValues[K],
  ): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const parsed = userFormSchema.safeParse({
      ...form,
      password: isEdit ? form.password : form.password,
    });

    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof UserFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof UserFormValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!isEdit && (!parsed.data.password || parsed.data.password.length < 6)) {
      setErrors((prev) => ({
        ...prev,
        password: 'Şifre en az 6 karakter olmalıdır.',
      }));
      return;
    }

    setIsSaving(true);
    try {
      const permission = userManagementService.permissionInputFromForm(parsed.data);
      if (isEdit && routeUserCode) {
        await userManagementService.updateUser(routeUserCode, {
          name: parsed.data.name,
          role: parsed.data.role,
          active: parsed.data.active,
          phone: parsed.data.phone ?? '',
          email: parsed.data.email ?? '',
          description: parsed.data.description ?? '',
          ...permission,
        });
        toast('Kullanıcı güncellendi', 'success');
      } else {
        await userManagementService.createUser({
          userCode: parsed.data.userCode,
          name: parsed.data.name,
          password: parsed.data.password ?? '',
          role: parsed.data.role,
          active: parsed.data.active,
          phone: parsed.data.phone,
          email: parsed.data.email,
          description: parsed.data.description,
          ...permission,
        });
        toast('Kullanıcı oluşturuldu', 'success');
      }
      void navigate(ROUTES.SETTINGS_USERS);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Kayıt başarısız', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!routeUserCode) return;
    setIsDeleting(true);
    try {
      await userManagementService.softDeleteUser(routeUserCode);
      toast('Kullanıcı silindi', 'success');
      void navigate(ROUTES.SETTINGS_USERS);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Silme başarısız', 'error');
    } finally {
      setIsDeleting(false);
      setShowDelete(false);
    }
  };

  const handlePasswordChange = async (): Promise<void> => {
    if (!routeUserCode) return;
    const parsed = userPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0]?.message ?? 'Şifre geçersiz');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);
    try {
      await userManagementService.changePassword(
        routeUserCode,
        parsed.data.password,
      );
      toast('Şifre güncellendi', 'success');
      setShowPassword(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Şifre güncellenemedi', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isEdit && isLoading) {
    return <LoadingSpinner fullPage label="Kullanıcı yükleniyor..." />;
  }

  if (isEdit && !isLoading && !user) {
    return (
      <div>
        <PageHeader
          title="Kullanıcı"
          backButton={<BackButton to={ROUTES.SETTINGS_USERS} />}
        />
        <div className="page-content">
          <p className="text-sm text-brand-gray-600">Kullanıcı bulunamadı.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
        subtitle={isEdit ? normalizeUserCode(routeUserCode ?? '') : 'Kullanıcı bilgileri'}
        backButton={<BackButton to={ROUTES.SETTINGS_USERS} />}
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-4">
        <Card className="space-y-3">
          <Input
            label="Kullanıcı Adı"
            value={form.userCode}
            onChange={(e) => {
              updateField('userCode', e.target.value.toUpperCase());
            }}
            error={errors.userCode}
            required
            disabled={isEdit}
          />
          <Input
            label="Ad Soyad"
            value={form.name}
            onChange={(e) => { updateField('name', e.target.value); }}
            error={errors.name}
            required
          />
          <Input
            label="Telefon"
            value={form.phone ?? ''}
            onChange={(e) => { updateField('phone', e.target.value); }}
            error={errors.phone}
          />
          <Input
            label="E-posta"
            type="email"
            value={form.email ?? ''}
            onChange={(e) => { updateField('email', e.target.value); }}
            error={errors.email}
          />
          <Input
            label="Açıklama"
            value={form.description ?? ''}
            onChange={(e) => { updateField('description', e.target.value); }}
            error={errors.description}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-brand-navy">Rol</span>
            <select
              className="w-full rounded-xl border border-brand-gray-200 px-3 py-2.5"
              value={form.role}
              onChange={(e) => { updateField('role', e.target.value as UserRole); }}
            >
              <option value={UserRole.ADMIN}>{USER_ROLE_LABELS[UserRole.ADMIN]}</option>
              <option value={UserRole.SALES_REP}>
                {USER_ROLE_LABELS[UserRole.SALES_REP]}
              </option>
              <option value={UserRole.MERCH}>{USER_ROLE_LABELS[UserRole.MERCH]}</option>
            </select>
          </label>

          {form.role === UserRole.SALES_REP ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-brand-navy">
                Logo satış temsilcisi kodları (SPECODE)
              </span>
              <textarea
                className="min-h-[88px] w-full rounded-xl border border-brand-gray-200 px-3 py-2.5 text-sm"
                value={form.salesRepCodesText ?? ''}
                onChange={(e) => {
                  updateField('salesRepCodesText', e.target.value);
                }}
                placeholder={'125\n130'}
              />
              <span className="mt-1 block text-xs text-brand-gray-500">
                Her satıra bir kod. İleride Customer.logoSalesRepCode ile
                eşleşecek (bu sürümde master-data filtresi yok).
              </span>
            </label>
          ) : null}

          {form.role === UserRole.MERCH ? (
            <div className="space-y-3 rounded-xl border border-brand-gray-100 bg-brand-gray-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-gray-500">
                Merch yetki profili (veri modeli — filtre henüz uygulanmaz)
              </p>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-brand-navy">
                  Cari kod pattern (PREFIX*)
                </span>
                <textarea
                  className="min-h-[72px] w-full rounded-xl border border-brand-gray-200 bg-white px-3 py-2.5 text-sm"
                  value={form.merchCustomerPatternsText ?? ''}
                  onChange={(e) => {
                    updateField('merchCustomerPatternsText', e.target.value);
                  }}
                  placeholder={'08*\n10*'}
                />
                <span className="mt-1 block text-xs text-brand-gray-500">
                  Yalnızca önek joker: 08* kabul; *08 / 0*8 reddedilir.
                </span>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-brand-navy">
                  Tekil cari kodları
                </span>
                <textarea
                  className="min-h-[72px] w-full rounded-xl border border-brand-gray-200 bg-white px-3 py-2.5 text-sm"
                  value={form.merchCustomerCodesText ?? ''}
                  onChange={(e) => {
                    updateField('merchCustomerCodesText', e.target.value);
                  }}
                  placeholder={'15001\n15027'}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-brand-navy">
                  Stok grup kodları (STGRPCODE)
                </span>
                <textarea
                  className="min-h-[72px] w-full rounded-xl border border-brand-gray-200 bg-white px-3 py-2.5 text-sm"
                  value={form.merchStockGroupCodesText ?? ''}
                  onChange={(e) => {
                    updateField('merchStockGroupCodesText', e.target.value);
                  }}
                  placeholder={'01\n03\n07'}
                />
              </label>
            </div>
          ) : null}

          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand-navy">Aktif</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => { updateField('active', e.target.checked); }}
              className="h-5 w-5 rounded border-brand-gray-300 text-brand-navy"
            />
          </label>
          {!isEdit ? (
            <Input
              label="Şifre"
              type="password"
              value={form.password ?? ''}
              onChange={(e) => { updateField('password', e.target.value); }}
              error={errors.password}
              required
            />
          ) : null}
        </Card>

        <Button type="submit" fullWidth size="lg" isLoading={isSaving}>
          {isEdit ? 'Güncelle' : 'Kaydet'}
        </Button>

        {isEdit ? (
          <>
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => { setShowPassword(true); }}
            >
              Kullanıcı Şifresini Değiştir
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              onClick={() => { setShowDelete(true); }}
            >
              Kullanıcıyı Sil
            </Button>
          </>
        ) : null}
      </form>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); }}
        onConfirm={() => void handleDelete()}
        title="Kullanıcıyı Sil"
        message="Bu kullanıcı silinecek ve listede görünmeyecek. Devam etmek istiyor musunuz?"
        confirmLabel="Sil"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={showPassword}
        onClose={() => {
          if (isChangingPassword) return;
          setShowPassword(false);
          setPassword('');
          setConfirmPassword('');
          setPasswordError(null);
        }}
        onConfirm={() => void handlePasswordChange()}
        title="Kullanıcı Şifresini Değiştir"
        confirmLabel="Şifreyi Kaydet"
        variant="primary"
        isLoading={isChangingPassword}
        message={
          <div className="space-y-3">
            <Input
              label="Yeni Şifre"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
            />
            <Input
              label="Şifre Tekrar"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); }}
              error={passwordError ?? undefined}
            />
          </div>
        }
      />
    </div>
  );
}
