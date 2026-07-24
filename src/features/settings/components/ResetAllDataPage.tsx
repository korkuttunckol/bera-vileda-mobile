import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { ConfirmDialog } from '@/shared/components/ui/Modal';
import { toast } from '@/stores/toastStore';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { ROUTES } from '@/shared/constants/routes';
import { dataCleanupService } from '../services/dataCleanupService';
import { SettingsBackButton } from './SettingsBackButton';

export function ResetAllDataPage() {
  const navigate = useNavigate();
  const resetOrderDraft = useOrderDraftStore((s) => s.reset);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async (): Promise<void> => {
    setIsResetting(true);
    try {
      await dataCleanupService.clearAllLocalData();
      resetOrderDraft();
      toast('Tüm veriler başarıyla sıfırlandı.', 'success');
      setShowConfirm(false);
      void navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      console.error('[ResetAllData] Veri sıfırlama hatası:', err);
      toast(err instanceof Error ? err.message : 'Sıfırlama başarısız', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tüm Verileri Sıfırla"
        backButton={<SettingsBackButton to={ROUTES.SETTINGS_DATA_MANAGEMENT} />}
      />
      <div className="page-content">
        <Card padding="md" className="border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-800">Dikkat</p>
          <p className="mt-2 text-sm leading-relaxed text-red-700">
            Bu işlem yalnızca uygulamanın yerel veritabanını temizler. Logo Wings veya
            başka bir harici sisteme hiçbir işlem gönderilmez.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-red-700">
            <li>Müşteriler ve cari kartları</li>
            <li>Ürünler ve stok bilgileri</li>
            <li>Bekleyen siparişler ve sipariş geçmişi</li>
            <li>Senkronizasyon kuyruğu</li>
          </ul>
        </Card>

        <Button variant="danger" fullWidth onClick={() => { setShowConfirm(true); }}>
          Tüm Verileri Sıfırla
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => {
          if (!isResetting) setShowConfirm(false);
        }}
        onConfirm={() => void handleReset()}
        title="Tüm Verileri Sıfırla"
        message={
          <div className="space-y-3 text-sm leading-relaxed text-brand-gray-600">
            <p>
              Bu işlem uygulamadaki tüm müşteri, ürün, stok ve sipariş verilerini
              kalıcı olarak silecektir.
            </p>
            <p>Gönderilmemiş siparişler de silinecektir.</p>
            <p>Bu işlem geri alınamaz.</p>
            <p>Devam etmek istiyor musunuz?</p>
          </div>
        }
        confirmLabel="Evet, Tüm Verileri Sıfırla"
        cancelLabel="İptal"
        variant="danger"
        isLoading={isResetting}
      />
    </div>
  );
}
