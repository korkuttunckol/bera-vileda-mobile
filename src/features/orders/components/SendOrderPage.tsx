import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOrder } from '../hooks/useOrder';
import {
  generateOrderExportFiles,
  shareOrderExportFiles,
} from '../services/orderExportService';
import { toast } from '@/stores/toastStore';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/utils/cn';

interface SendOptionProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  onChange?: (checked: boolean) => void;
}

function SendOption({ label, checked, disabled, hint, onChange }: SendOptionProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3.5',
        disabled
          ? 'cursor-not-allowed border-brand-gray-200 bg-brand-gray-50 opacity-70'
          : 'cursor-pointer border-brand-gray-200 bg-white active:bg-brand-gray-50',
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 rounded border-brand-gray-300 text-brand-navy focus:ring-brand-navy/20"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span>
        <span className="block text-base font-medium text-brand-navy">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs text-brand-gray-500">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

export function SendOrderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { order, lines, isLoading } = useOrder(id);
  const [sendPdf, setSendPdf] = useState(true);
  const [sendExcel, setSendExcel] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const createdByName = useMemo(
    () => user?.displayName ?? user?.email ?? 'Kullanıcı',
    [user],
  );

  const handleSend = async (): Promise<void> => {
    if (!order || lines.length === 0) return;
    if (!sendPdf && !sendExcel && !sendWhatsapp) {
      toast('En az bir gönderim seçeneği işaretleyin', 'warning');
      return;
    }

    setIsSending(true);
    try {
      const files = await generateOrderExportFiles(order, lines, createdByName);
      await shareOrderExportFiles(files, {
        pdf: sendPdf,
        excel: sendExcel,
        whatsapp: sendWhatsapp,
      });
      toast('Dosyalar hazırlandı', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gönderim başarısız', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Sipariş yükleniyor..." />;
  }

  if (!order) {
    return (
      <EmptyState
        title="Sipariş bulunamadı"
        action={
          <Button onClick={() => void navigate(ROUTES.ORDER_HISTORY)}>
            Sipariş Geçmişine Dön
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="GÖNDER"
        subtitle={`${order.customerName} · ${order.branchName ?? 'Merkez'}`}
        backButton={<BackButton to={ROUTES.ORDER_HISTORY} />}
      />

      <div className="page-content space-y-4">
        <Card padding="md" className="space-y-1">
          <p className="text-xs text-brand-gray-500">Müşteri</p>
          <p className="font-medium text-brand-navy">{order.customerName}</p>
          <p className="text-xs text-brand-gray-500">Şube</p>
          <p className="font-medium text-brand-navy">{order.branchName ?? 'Merkez'}</p>
          <p className="text-xs text-brand-gray-500">Kalem / Adet</p>
          <p className="font-medium text-brand-navy">
            {order.lineCount} kalem · {order.itemCount} adet
          </p>
        </Card>

        <div className="space-y-2">
          <SendOption label="PDF" checked={sendPdf} onChange={setSendPdf} />
          <SendOption label="Excel" checked={sendExcel} onChange={setSendExcel} />
          <SendOption label="WhatsApp" checked={sendWhatsapp} onChange={setSendWhatsapp} />
          <SendOption
            label="Logo GO Wings"
            checked={false}
            disabled
            hint="İleride eklenecek"
          />
        </div>

        <Button
          fullWidth
          size="lg"
          isLoading={isSending}
          onClick={() => void handleSend()}
        >
          GÖNDER
        </Button>
      </div>
    </div>
  );
}
