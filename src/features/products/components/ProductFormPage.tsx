import { useState, useEffect, type SubmitEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { productService } from '../services/productService';
import { useProduct } from '../hooks/useProduct';
import { useProductFieldVisibility } from '../hooks/useProductFieldVisibility';
import { productFormSchema } from '@/shared/types/product.schema';
import type { ProductFormValues } from '@/shared/types/product.schema';
import { ROUTES } from '@/shared/constants/routes';

const EMPTY: ProductFormValues = {
  sku: '',
  name: '',
  category: 'Genel',
  unit: 'Adet',
  barcode: '',
  listPrice: 0,
  vatRate: 20,
  stockQuantity: 0,
  isActive: true,
};

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showField = useProductFieldVisibility({ formMode: true });
  const { product, isLoading } = useProduct(id);
  const [form, setForm] = useState<ProductFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isEdit && product && !initialized) {
      setForm(productService.toFormValues(product));
      setInitialized(true);
    }
  }, [isEdit, product, initialized]);

  const updateField = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!user) return;

    const parsed = productFormSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof ProductFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ProductFormValues;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && id) {
        await productService.update(id, parsed.data, user.uid);
        toast('Ürün güncellendi', 'success');
      } else {
        await productService.create(parsed.data, user.uid);
        toast('Ürün oluşturuldu', 'success');
      }
      void navigate(ROUTES.PRODUCTS);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Kayıt başarısız', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isEdit && isLoading) {
    return <LoadingSpinner fullPage label="Ürün yükleniyor..." />;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Stok Kartı' : 'Yeni Ürün'}
        subtitle={isEdit ? form.sku : 'Ürün bilgileri'}
        backButton={<BackButton to={ROUTES.PRODUCTS} />}
      />
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-4">
        <Card className="space-y-3">
          {showField('sku') ? (
            <Input
              label="Ürün Kodu (SKU)"
              value={form.sku}
              onChange={(e) => { updateField('sku', e.target.value); }}
              error={errors.sku}
              required
            />
          ) : null}
          {showField('name') ? (
            <Input
              label="Ürün Adı"
              value={form.name}
              onChange={(e) => { updateField('name', e.target.value); }}
              error={errors.name}
              required
            />
          ) : null}
          {showField('category') ? (
            <Input
              label="Kategori"
              value={form.category}
              onChange={(e) => { updateField('category', e.target.value); }}
              error={errors.category}
            />
          ) : null}
          {showField('unit') ? (
            <Input
              label="Birim"
              value={form.unit}
              onChange={(e) => { updateField('unit', e.target.value); }}
              error={errors.unit}
            />
          ) : null}
          {showField('barcode') ? (
            <Input
              label="Barkod"
              value={form.barcode}
              onChange={(e) => { updateField('barcode', e.target.value); }}
            />
          ) : null}
          {showField('price') ? (
            <Input
              label="Liste Fiyatı (₺)"
              type="number"
              inputMode="decimal"
              value={String(form.listPrice)}
              onChange={(e) => { updateField('listPrice', Number(e.target.value)); }}
              error={errors.listPrice}
            />
          ) : null}
          {showField('vatRate') ? (
            <Input
              label="KDV (%)"
              type="number"
              inputMode="numeric"
              value={String(form.vatRate)}
              onChange={(e) => { updateField('vatRate', Number(e.target.value)); }}
              error={errors.vatRate}
            />
          ) : null}
          {showField('stock') ? (
            <Input
              label="Depo Stok"
              type="number"
              inputMode="numeric"
              value={String(form.stockQuantity)}
              onChange={(e) => { updateField('stockQuantity', Number(e.target.value)); }}
              error={errors.stockQuantity}
            />
          ) : null}
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand-navy">Aktif</span>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => { updateField('isActive', e.target.checked); }}
              className="h-5 w-5 rounded border-brand-gray-300 text-brand-navy"
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
