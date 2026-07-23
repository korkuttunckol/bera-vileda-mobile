import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { shareOrderReport } from '../report';
import { useOrderCreatedByName } from '../hooks/useOrderCreatedByName';
import { toast } from '@/stores/toastStore';
import type { Order, OrderLine } from '@/shared/types/order.types';
import type { OrderReportShareKind } from '../report';

interface OrderShareActionsProps {
  order: Order;
  lines: OrderLine[];
}

export function OrderShareActions({ order, lines }: OrderShareActionsProps) {
  const createdByName = useOrderCreatedByName(order);
  const [activeAction, setActiveAction] = useState<OrderReportShareKind | null>(null);

  const handleShare = async (kind: OrderReportShareKind): Promise<void> => {
    setActiveAction(kind);
    try {
      await shareOrderReport(order, lines, createdByName, kind);
      toast('Rapor oluşturuldu', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Paylaşım başarısız', 'error');
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-brand-navy">Tekrar Paylaş</p>
      <Button
        fullWidth
        variant="outline"
        isLoading={activeAction === 'pdf'}
        disabled={activeAction !== null && activeAction !== 'pdf'}
        onClick={() => void handleShare('pdf')}
      >
        PDF Oluştur ve Paylaş
      </Button>
      <Button
        fullWidth
        variant="outline"
        isLoading={activeAction === 'excel'}
        disabled={activeAction !== null && activeAction !== 'excel'}
        onClick={() => void handleShare('excel')}
      >
        Excel Oluştur ve Paylaş
      </Button>
      <Button
        fullWidth
        variant="outline"
        isLoading={activeAction === 'whatsapp'}
        disabled={activeAction !== null && activeAction !== 'whatsapp'}
        onClick={() => void handleShare('whatsapp')}
      >
        WhatsApp ile Paylaş
      </Button>
    </div>
  );
}
