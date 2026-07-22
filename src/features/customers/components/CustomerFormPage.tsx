import { useState, useEffect, type SubmitEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { ConfirmDialog } from '@/shared/components/ui/Modal';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { customerService } from '../services/customerService';
import { useCustomer } from '../hooks/useCustomer';
import { customerFormSchema } from '@/shared/types/customer.schema';
import type { CustomerFormValues } from '@/shared/types/customer.schema';
import { useCustomerDisplayFields } from '@/stores/displayPreferencesStore';
import {
  hasCustomerAddressFields,
  isCustomerFieldVisible,
} from '@/shared/lib/indexeddb/displayPreferencesStorage';
import type { CustomerDisplayField } from '@/shared/types/displayPreferences.types';
import { ROUTES } from '@/shared/constants/routes';
import { CustomerBranchesSection } from './CustomerBranchesSection';

const EMPTY_FORM: CustomerFormValues = {
  code: '',
  name: '',
  taxNumber: '',
  contactPerson: '',
  phone: '',
  email: '',
  city: '',
  district: '',
  fullAddress: '',
  isActive: true,
};

export function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const customerFields = useCustomerDisplayFields();
  const { customer, isLoading } = useCustomer(id);
  const [form, setForm] = useState<CustomerFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormValues, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isEdit && customer && !initialized) {
      setForm(customerService.toFormValues(customer));
      setInitialized(true);
    }
  }, [isEdit, customer, initialized]);

  const updateField = <K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K],
  ): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!user) return;

    const parsed = customerFormSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof CustomerFormValues, string>> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof CustomerFormValues;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && id) {
        await customerService.update(id, parsed.data, user.uid);
        toast('Müşteri güncellendi', 'success');
      } else {
        await customerService.create(parsed.data, user.uid, user.uid);
        toast('Müşteri oluşturuldu', 'success');
      }
      void navigate(ROUTES.CUSTOMERS);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Kayıt başarısız', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!user || !id) return;
    setIsDeleting(true);
    try {
      await customerService.softDelete(id, user.uid);
      toast('Müşteri silindi', 'success');
      void navigate(ROUTES.CUSTOMERS);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Silme başarısız', 'error');
    } finally {
      setIsDeleting(false);
      setShowDelete(false);
    }
  };

  if (isEdit && isLoading) {
    return <LoadingSpinner fullPage label="Müşteri yükleniyor..." />;
  }

  const showField = (field: CustomerDisplayField): boolean =>
    isCustomerFieldVisible(customerFields, field, { formMode: true });
  const showAddressSection = hasCustomerAddressFields(customerFields);

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
        subtitle={isEdit ? customer?.code : 'Manuel cari kartı'}
        backButton={<BackButton to={ROUTES.CUSTOMERS} />}
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-4">
        <Card className="space-y-4">
          <Input
            label="Cari Kodu *"
            value={form.code}
            onChange={(e) => { updateField('code', e.target.value.toUpperCase()); }}
            error={errors.code}
            placeholder="CR001"
          />
          <Input
            label="Müşteri Adı *"
            value={form.name}
            onChange={(e) => { updateField('name', e.target.value); }}
            error={errors.name}
            placeholder="Firma adı"
          />
          {showField('taxNumber') ? (
            <Input
              label="Vergi No"
              value={form.taxNumber}
              onChange={(e) => { updateField('taxNumber', e.target.value); }}
              error={errors.taxNumber}
            />
          ) : null}
          {showField('contactPerson') ? (
            <Input
              label="Yetkili"
              value={form.contactPerson}
              onChange={(e) => { updateField('contactPerson', e.target.value); }}
            />
          ) : null}
          {showField('phone') ? (
            <Input
              label="Telefon"
              type="tel"
              value={form.phone}
              onChange={(e) => { updateField('phone', e.target.value); }}
            />
          ) : null}
          {showField('email') ? (
            <Input
              label="E-posta"
              type="email"
              value={form.email}
              onChange={(e) => { updateField('email', e.target.value); }}
              error={errors.email}
            />
          ) : null}
        </Card>

        {showAddressSection ? (
          <Card className="space-y-4">
            <p className="text-sm font-medium text-brand-navy">Adres</p>
            {showField('city') ? (
              <Input
                label="İl"
                value={form.city}
                onChange={(e) => { updateField('city', e.target.value); }}
              />
            ) : null}
            {showField('district') ? (
              <Input
                label="İlçe"
                value={form.district}
                onChange={(e) => { updateField('district', e.target.value); }}
              />
            ) : null}
            {showField('fullAddress') ? (
              <Input
                label="Açık Adres"
                value={form.fullAddress}
                onChange={(e) => { updateField('fullAddress', e.target.value); }}
              />
            ) : null}
          </Card>
        ) : null}

        {showField('status') ? (
          <Card>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-brand-navy">Aktif</span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => { updateField('isActive', e.target.checked); }}
                className="h-5 w-5 rounded border-brand-gray-300 text-brand-navy focus:ring-brand-navy"
              />
            </label>
          </Card>
        ) : null}

        {isEdit && id ? <CustomerBranchesSection customerId={id} /> : null}

        <Button type="submit" fullWidth size="lg" isLoading={isSaving}>
          {isEdit ? 'Güncelle' : 'Kaydet'}
        </Button>

        {isEdit && id ? (
          <Button
            type="button"
            variant="danger"
            fullWidth
            onClick={() => { setShowDelete(true); }}
          >
            Müşteriyi Sil
          </Button>
        ) : null}
      </form>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); }}
        onConfirm={() => void handleDelete()}
        title="Müşteriyi Sil"
        message="Bu müşteri silinecek. Kayıt sistemden kaldırılmaz, pasif hale getirilir. Devam etmek istiyor musunuz?"
        confirmLabel="Sil"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
