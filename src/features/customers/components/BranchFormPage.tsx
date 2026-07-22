import { useState, type SubmitEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { branchService } from '../services/branchService';
import { branchLocalRepository } from '@/shared/lib/indexeddb/repositories/branchRepository';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { branchFormSchema } from '@/shared/types/customer.schema';
import type { BranchFormValues } from '@/shared/types/customer.schema';
import { ROUTES } from '@/shared/constants/routes';
import type { BranchFormReturnTo } from '@/shared/constants/routes';
import { useEffect } from 'react';

const EMPTY: BranchFormValues = {
  name: '',
  address: '',
  phone: '',
  contactPerson: '',
  isActive: true,
};

export function BranchFormPage() {
  const { id: customerId, branchId } = useParams<{
    id: string;
    branchId: string;
  }>();
  const isEdit = Boolean(branchId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') as BranchFormReturnTo | null;
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<BranchFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof BranchFormValues, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !branchId) return;
    void branchLocalRepository.getById(branchId).then((branch) => {
      if (branch) setForm(branchService.toFormValues(branch));
      setIsLoading(false);
    });
  }, [isEdit, branchId]);

  const navigateAfterSave = (): void => {
    if (returnTo === 'order') {
      useOrderDraftStore.getState().setStep('branch');
      void navigate(ROUTES.NEW_ORDER);
      return;
    }
    if (customerId) {
      void navigate(ROUTES.CUSTOMER_BRANCHES.replace(':id', customerId));
    }
  };

  const backTarget =
    returnTo === 'order'
      ? { to: ROUTES.NEW_ORDER, label: 'Sipariş' }
      : customerId
        ? { to: ROUTES.CUSTOMER_BRANCHES.replace(':id', customerId), label: 'Şubeler' }
        : { to: ROUTES.CUSTOMERS, label: 'Müşteriler' };

  const updateField = <K extends keyof BranchFormValues>(
    key: K,
    value: BranchFormValues[K],
  ): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!user || !customerId) return;

    const parsed = branchFormSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof BranchFormValues, string>> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as keyof BranchFormValues] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && branchId) {
        await branchService.update(branchId, parsed.data, user.uid);
        toast('Şube güncellendi', 'success');
      } else {
        await branchService.create(customerId, parsed.data, user.uid);
        toast('Şube eklendi', 'success');
      }
      navigateAfterSave();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Kayıt başarısız', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullPage label="Şube yükleniyor..." />;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Şube Düzenle' : 'Yeni Şube'}
        subtitle="Şube bilgileri"
        backButton={<BackButton to={backTarget.to} label={backTarget.label} />}
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-4">
        <Card className="space-y-4">
          <Input
            label="Şube Adı *"
            value={form.name}
            onChange={(e) => { updateField('name', e.target.value); }}
            error={errors.name}
            placeholder="Merkez, Depo, Mağaza..."
          />
          <Input
            label="Adres"
            value={form.address}
            onChange={(e) => { updateField('address', e.target.value); }}
          />
          <Input
            label="Telefon"
            type="tel"
            value={form.phone}
            onChange={(e) => { updateField('phone', e.target.value); }}
          />
          <Input
            label="Yetkili"
            value={form.contactPerson}
            onChange={(e) => { updateField('contactPerson', e.target.value); }}
          />
        </Card>

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

        <Button type="submit" fullWidth size="lg" isLoading={isSaving}>
          {isEdit ? 'Güncelle' : 'Kaydet'}
        </Button>
      </form>
    </div>
  );
}
