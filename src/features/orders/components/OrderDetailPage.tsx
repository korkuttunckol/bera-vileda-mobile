import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderShareActions } from './OrderShareActions';
import { useOrder } from '../hooks/useOrder';
import { orderService } from '../services/orderService';
import { useSync } from '@/features/sync';
import {
  formatOrderReportDate,
  formatOrderReportTime,
} from '../report';
import { toast } from '@/stores/toastStore';
import { ROUTES } from '@/shared/constants/routes';
import { isFirebaseConfigured } from '@/config/env';
import { formatCurrency } from '@/shared/utils/cn';
import type { Order, OrderLine, OrderSyncStatus } from '@/shared/types/order.types';

function SummaryIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy"
      aria-hidden
    >
      {children}
    </span>
  );
}

function CustomerInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-x-3 text-sm">
      <span className="pt-0.5 font-medium text-brand-gray-500">{label}</span>
      <span className="min-w-0 break-words font-semibold leading-snug text-brand-navy">
        {value}
      </span>
    </div>
  );
}

function OrderSummaryCell({
  label,
  children,
  icon,
}: {
  label: string;
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1 text-center">
      <SummaryIcon>{icon}</SummaryIcon>
      <p className="text-[10px] font-medium uppercase tracking-wide text-brand-gray-400">
        {label}
      </p>
      <div className="mt-0.5 w-full text-sm font-semibold leading-snug text-brand-navy">
        {children}
      </div>
    </div>
  );
}

function OrderDetailLineItem({
  line,
}: {
  line: OrderLine;
}) {
  const unit = line.unit ?? 'Adet';
  const discounts = line.discountRates?.filter((rate) => rate > 0) ?? [];

  return (
    <Card padding="sm" className="!px-3 !py-2.5 !shadow-sm">
      <p className="break-words text-sm font-semibold leading-snug text-brand-navy">
        {line.productName}
      </p>

      <p className="mt-1 text-xs text-brand-gray-500">Ürün kodu: {line.productSku}</p>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 border-t border-brand-gray-100 pt-1.5 text-sm">
        <p className="min-w-0 text-brand-gray-600">
          Miktar:{' '}
          <span className="font-semibold text-brand-navy">
            {line.quantity} {unit}
          </span>
        </p>
        <p className="min-w-0 text-right text-brand-gray-600">
          KDV: <span className="font-semibold text-brand-navy">%{line.vatRate}</span>
        </p>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-sm">
        <p className="text-brand-gray-600">
          İskonto:{' '}
          <span className="font-semibold text-brand-navy">
            {discounts.length > 0 ? `% ${discounts.join('+')}` : '—'}
          </span>
        </p>
        <p className="text-right font-semibold tabular-nums text-brand-navy">
          Net: {formatCurrency(line.lineTotal)}
        </p>
      </div>
    </Card>
  );
}

function OrderFinancialSummary({ order }: { order: Order }) {
  const grossTotal = order.subtotal + order.discountTotal;
  return (
    <Card padding="md" className="space-y-2">
      <div className="flex justify-between gap-4 text-sm text-brand-gray-600">
        <span>Sipariş toplamı</span><span className="tabular-nums">{formatCurrency(grossTotal)}</span>
      </div>
      <div className="flex justify-between gap-4 text-sm text-brand-gray-600">
        <span>İskonto toplamı</span><span className="tabular-nums">-{formatCurrency(order.discountTotal)}</span>
      </div>
      <div className="flex justify-between gap-4 text-sm text-brand-gray-600">
        <span>KDV</span><span className="tabular-nums">{formatCurrency(order.vatTotal)}</span>
      </div>
      <div className="flex justify-between gap-4 border-t border-brand-gray-200 pt-2 text-base font-bold text-brand-navy">
        <span>KDV dahil tutar</span><span className="tabular-nums">{formatCurrency(order.grandTotal)}</span>
      </div>
    </Card>
  );
}

function OrderSummaryCard({
  orderDate,
  lineCount,
  totalQuantity,
  status,
}: {
  orderDate: string;
  lineCount: number;
  totalQuantity: number;
  status: OrderSyncStatus;
}) {
  return (
    <Card padding="sm">
      <div className="grid grid-cols-4 gap-1 divide-x divide-brand-gray-100">
        <OrderSummaryCell
          label="Sipariş Tarihi"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        >
          <p className="truncate">{formatOrderReportDate(orderDate)}</p>
          <p className="text-xs font-medium text-brand-gray-500">
            {formatOrderReportTime(orderDate)}
          </p>
        </OrderSummaryCell>

        <OrderSummaryCell
          label="Toplam Kalem"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h10" />
            </svg>
          }
        >
          {lineCount}
        </OrderSummaryCell>

        <OrderSummaryCell
          label="Toplam Adet"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        >
          {totalQuantity}
        </OrderSummaryCell>

        <OrderSummaryCell
          label="Sipariş Durumu"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          }
        >
          <OrderStatusBadge
            status={status}
            variant="inline"
            className="justify-center text-xs"
          />
        </OrderSummaryCell>
      </div>
    </Card>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { order, lines, isLoading, notFound, reload } = useOrder(id);
  const { syncNow, isSyncing } = useSync();
  const [isRetrying, setIsRetrying] = useState(false);
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
        backButton={<BackButton to={ROUTES.ORDER_HISTORY} />}
        action={<OrderStatusBadge status={order.orderSyncStatus} />}
      />

      <div className="space-y-3 p-3 pb-6">
        {/* Cari Bilgileri */}
        <Card padding="md" className="space-y-2.5">
          <CustomerInfoRow
            label="Cari Kod"
            value={order.customerCode?.trim() || '—'}
          />
          <CustomerInfoRow label="Cari Ünvan" value={order.customerName} />
          <CustomerInfoRow
            label="Şube"
            value={order.branchName?.trim() || 'Merkez'}
          />
        </Card>

        {/* Sipariş Özeti — 4 kolon */}
        <OrderSummaryCard
          orderDate={order.orderDate}
          lineCount={order.lineCount}
          totalQuantity={totalQuantity}
          status={order.orderSyncStatus}
        />

        {order.notes ? (
          <Card padding="sm">
            <p className="text-xs font-medium text-brand-gray-500">Not</p>
            <p className="mt-1 break-words text-sm text-brand-navy">{order.notes}</p>
          </Card>
        ) : null}

        {order.syncError && order.orderSyncStatus === 'failed' ? (
          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-xs font-medium text-red-800">Senkronizasyon Hatası</p>
            <p className="mt-1 text-sm text-red-700">{order.syncError}</p>
          </div>
        ) : null}

        {/* Ürün Listesi */}
        <div className="space-y-1.5">
          <p className="px-0.5 text-sm font-semibold text-brand-navy">
            Ürün Listesi ({lines.length})
          </p>
          {lines.map((line) => (
            <OrderDetailLineItem
              key={line.id}
              line={line}
            />
          ))}
        </div>

        <OrderFinancialSummary order={order} />

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
            {order.orderSyncStatus === 'failed' ? 'Yeniden Gönder' : 'Siparişi Gönder'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
