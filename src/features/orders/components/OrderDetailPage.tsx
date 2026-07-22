import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { OrderStatusBadge } from './OrderStatusBadge';
import { useOrder } from '../hooks/useOrder';
import { orderService } from '../services/orderService';
import { productService } from '@/features/products/services/productService';
import { useSync } from '@/features/sync';
import { isProductOutOfStock } from '@/features/orders/utils/stockControl';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/shared/utils/cn';
import { ROUTES } from '@/shared/constants/routes';
import { isFirebaseConfigured } from '@/config/env';
import type { OrderLine } from '@/shared/types/order.types';

interface LineStockInfo {
  stockQuantity: number;
  unit: string;
}

function OrderDetailLineItem({
  line,
  stock,
}: {
  line: OrderLine;
  stock?: LineStockInfo;
}) {
  const unit = line.unit ?? 'Adet';
  const isOutOfStock = stock != null && isProductOutOfStock(stock);

  return (
    <div className="px-4 py-4">
      <p className="break-words text-[16px] font-semibold leading-snug text-brand-navy">
        {line.productName}
      </p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-brand-gray-400">
        Ürün Kodu
      </p>
      <p className="mt-0.5 text-sm font-semibold tracking-wide text-brand-navy">
        {line.productSku}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <p className="font-medium text-brand-gray-700">
          Sipariş Adedi:{' '}
          <span className="text-brand-navy">
            {line.quantity} {unit}
          </span>
        </p>
      </div>

      {stock != null ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs text-brand-gray-500">
            Depo stok: {stock.stockQuantity} {stock.unit}
          </p>
          {isOutOfStock ? (
            <Badge
              label="Stok Yok"
              variant="passive"
              className="!bg-red-100 !text-red-700"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { order, lines, isLoading, notFound, reload } = useOrder(id);
  const { syncNow, isSyncing } = useSync();
  const [isRetrying, setIsRetrying] = useState(false);
  const [stockByProductId, setStockByProductId] = useState<
    Record<string, LineStockInfo>
  >({});
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (lines.length === 0) {
      setStockByProductId({});
      return;
    }

    void (async () => {
      const entries = await Promise.all(
        lines.map(async (line) => {
          const product = await productService.getById(line.productId);
          if (!product) return null;
          return [
            line.productId,
            { stockQuantity: product.stockQuantity, unit: product.unit },
          ] as const;
        }),
      );

      if (!isMountedRef.current) return;

      const next: Record<string, LineStockInfo> = {};
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      setStockByProductId(next);
    })();
  }, [lines]);

  const canRetry =
    isFirebaseConfigured() &&
    order &&
    (order.orderSyncStatus === 'failed' ||
      order.orderSyncStatus === 'pending_offline');

  const handleRetry = async (): Promise<void> => {
    if (!order) return;
    setIsRetrying(true);
    try {
      await orderService.retryOrderSync(order.id);
      await syncNow('manual');
      await reload();
      toast('Sipariş yeniden gönderildi', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gönderim başarısız', 'error');
      await reload();
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullPage label="Sipariş yükleniyor..." />;
  }

  if (notFound || !order) {
    return (
      <div>
        <PageHeader
          title="Sipariş Bulunamadı"
          backButton={<BackButton to={ROUTES.ORDER_HISTORY} />}
        />
        <div className="p-4">
          <EmptyState
            title="Sipariş bulunamadı"
            description="Kayıt silinmiş veya geçersiz bir bağlantı olabilir."
            action={
              <Button onClick={() => void navigate(ROUTES.ORDER_HISTORY)}>
                Sipariş Geçmişine Dön
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const totalQuantity =
    order.itemCount ?? lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div>
      <PageHeader
        title={order.localOrderNumber ?? order.orderNumber ?? 'Sipariş Detayı'}
        subtitle={order.customerName}
        backButton={<BackButton to={ROUTES.ORDER_HISTORY} />}
        action={<OrderStatusBadge status={order.orderSyncStatus} />}
      />

      <div className="space-y-4 p-4">
        <Card padding="md" className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray-500">Tarih</span>
            <span className="font-medium text-brand-navy">
              {formatDate(order.orderDate)}
            </span>
          </div>
          {order.customerCode ? (
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray-500">Cari Kodu</span>
              <span className="font-medium text-brand-navy">{order.customerCode}</span>
            </div>
          ) : null}
          {order.branchName ? (
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray-500">Şube</span>
              <span className="font-medium text-brand-navy">{order.branchName}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-sm">
            <span className="text-brand-gray-500">Kalem / Adet</span>
            <span className="font-medium text-brand-navy">
              {order.lineCount} kalem · {totalQuantity} adet
            </span>
          </div>
          {order.notes ? (
            <div className="border-t border-brand-gray-100 pt-3">
              <p className="text-xs text-brand-gray-500">Not</p>
              <p className="mt-1 text-sm text-brand-navy">{order.notes}</p>
            </div>
          ) : null}
          {order.syncError && order.orderSyncStatus === 'failed' ? (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs font-medium text-red-800">Senkronizasyon Hatası</p>
              <p className="mt-1 text-sm text-red-700">{order.syncError}</p>
            </div>
          ) : null}
        </Card>

        <Card padding="none">
          <div className="border-b border-brand-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-brand-navy">
              Kalemler ({lines.length})
            </p>
          </div>
          <div className="divide-y divide-brand-gray-100">
            {lines.map((line) => (
              <OrderDetailLineItem
                key={line.id}
                line={line}
                stock={stockByProductId[line.productId]}
              />
            ))}
          </div>
        </Card>

        {canRetry ? (
          <Button
            fullWidth
            onClick={() => void handleRetry()}
            isLoading={isRetrying || isSyncing}
          >
            Yeniden Gönder
          </Button>
        ) : null}
      </div>
    </div>
  );
}
