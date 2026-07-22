import { useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/Modal';
import { toast } from '@/stores/toastStore';
import { ROUTES } from '@/shared/constants/routes';
import { dataCleanupService } from '../services/dataCleanupService';
import { SettingsBackButton } from './SettingsBackButton';

export function ClearOrdersPage() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async (): Promise<void> => {
    setIsClearing(true);
    try {
      const count = await dataCleanupService.clearOrderData();
      toast(`${String(count)} sipariş verisi temizlendi`, 'success');
      setShowConfirm(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Temizleme başarısız', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Sipariş Verilerini Temizle"
        backButton={<SettingsBackButton to={ROUTES.SETTINGS_DATA_MANAGEMENT} />}
      />
      <div className="space-y-4 p-4">
        <Card padding="md" className="border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-800">Dikkat</p>
          <p className="mt-2 text-sm text-red-700">
            Bu işlem telefondaki tüm sipariş kayıtlarını ve sipariş satırlarını
            kalıcı olarak siler. Bekleyen sipariş kuyruğu da temizlenir.
          </p>
          <p className="mt-2 text-sm text-red-700">
            Müşteri, ürün ve cari verileri etkilenmez. Bu işlem geri alınamaz.
          </p>
        </Card>

        <Button variant="danger" fullWidth onClick={() => { setShowConfirm(true); }}>
          Sipariş Verilerini Temizle
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); }}
        onConfirm={() => void handleClear()}
        title="Sipariş Verilerini Sil"
        message="Tüm sipariş kayıtları ve bekleyen gönderim kuyruğu kalıcı olarak silinecek. Devam etmek istiyor musunuz?"
        confirmLabel="Evet, Temizle"
        cancelLabel="İptal"
        variant="danger"
        isLoading={isClearing}
      />
    </div>
  );
}
