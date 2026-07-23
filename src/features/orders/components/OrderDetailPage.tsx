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
import { OrderShareActions } from './OrderShareActions';
import { useOrder } from '../hooks/useOrder';
import { orderService } from '../services/orderService';
import { productService } from '@/features/products/services/productService';
import { useSync } from '@/features/sync';
import {
  formatOrderReportDate,
  formatOrderReportTime,
} from '../report';
import { isProductOutOfStock } from '@/features/orders/utils/stockControl';
import { toast } from '@/stores/toastStore';
import { ROUTES } from '@/shared/constants/routes';
import { isFirebaseConfigured } from '@/config/env';
import type { OrderLine } from '@/shared/types/order.types';

interface LineProductInfo {
  barcode?: string;
  stockQuantity: number;
  unit: string;
}

function OrderDetailLineItem({
  line,
  productInfo,
}: {
  line: OrderLine;
  productInfo?: LineProductInfo;
}) {
  const unit = line.unit ?? productInfo?.unit ?? 'Adet';
  const isOutOfStock =
    productInfo != null && isProductOutOfStock(productInfo);

  return (
    <div className="px-4 py-4">
      <p className="break-words text-[16px] font-semibold leading-snug text-brand-navy">
        {line.productName}
      </p>
      {productInfo?.barcode ? (
        <>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-brand-gray-400">
            Barkod
          </p>
          <p className="mt-0.5 text-sm font-semibold tracking-wide text-brand-navy">
            {productInfo.barcode}
          </p>
        </>
      ) : null}
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-brand-gray-400">
        Ürün Kodu
      </p>
      <p className="mt-0.5 text-sm font-semibold tracking-wide text-brand-navy">
        {line.productSku}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <p className="font-medium text-brand-gray-700">
          Miktar:{' '}
          <span className="text-brand-navy">
            {line.quantity} {unit}
          </span>
        </p>
      </div>

      {productInfo != null ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs text-brand-gray-500">
            Depo stok: {productInfo.stockQuantity} {productInfo.unit}
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
  const [productInfoByProductId, setProductInfoByProductId] = useState<
    Record<string, LineProductInfo>
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
      setProductInfoByProductId({});
      return;
    }

    void (async () => {
      const entries = await Promise.all(
        lines.map(async (line) => {
          const product = await productService.getById(line.productId);
          if (!product) return null;
          return [
            line.productId,
            {
              barcode: product.barcode,
              stockQuantity: product.stockQuantity,
              unit: product.unit,
            },
          ] as const;
        }),
      );

      if (!isMountedRef.current) return;

      const next: Record<string, LineProductInfo> = {};
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      setProductInfoByProductId(next);
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
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-brand-gray-500">Sipariş Tarihi</span>
            <span className="font-medium text-brand-navy">
              {formatOrderReportDate(order.orderDate)}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-brand-gray-500">Sipariş Saati</span>
            <span className="font-medium text-brand-navy">
              {formatOrderReportTime(order.orderDate)}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-brand-gray-500">Cari Kod</span>
            <span className="font-medium text-brand-navy">
              {order.customerCode ?? '-'}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-brand-gray-500">Cari Adı</span>
            <span className="text-right font-medium text-brand-navy">
              {order.customerName}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-brand-gray-500">Şube</span>
            <span className="font-medium text-brand-navy">
              {order.branchName ?? 'Merkez'}
            </span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-brand-gray-500">Toplam Kalem</span>
            <span className="font-medium text-brand-navy">{order.lineCount}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-brand-gray-500">Toplam Adet</span>
            <span className="font-medium text-brand-navy">{totalQuantity}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-brand-gray-500">Sipariş Durumu</span>
            <OrderStatusBadge status={order.orderSyncStatus} variant="inline" />
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
              Ürün Listesi ({lines.length})
            </p>
          </div>
          <div className="divide-y divide-brand-gray-100">
            {lines.map((line) => (
              <OrderDetailLineItem
                key={line.id}
                line={line}
                productInfo={productInfoByProductId[line.productId]}
              />
            ))}
          </div>
        </Card>

        {order.orderSyncStatus === 'sent' ? (
          <Card padding="md">
            <OrderShareActions order={order} lines={lines} />
          </Card>
        ) : null}

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
