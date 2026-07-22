import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { OrderCard } from './OrderCard';
import { SyncReportCard } from '@/features/sync/components/SyncReportCard';
import { useOrders } from '../hooks/useOrders';
import { useSync } from '@/features/sync';
import { cn } from '@/shared/utils/cn';
import { ROUTES } from '@/shared/constants/routes';
import type { OrderHistoryFilter } from '@/shared/types/order.types';

const FILTERS: { key: OrderHistoryFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'pending', label: 'Bekleyen' },
  { key: 'sent', label: 'Gönderildi' },
  { key: 'failed', label: 'Hatalı' },
];

export function OrderHistoryPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<OrderHistoryFilter>('all');
  const { orders, isLoading, pendingCount, reload } = useOrders(filter);
  const { isSyncing, lastReport, syncNow } = useSync();

  const handleSyncPending = async (): Promise<void> => {
    await syncNow('manual');
    await reload();
  };

  return (
    <div>
      <PageHeader
        title="Sipariş Geçmişi"
        subtitle="Offline siparişlerinizi yönetin"
      />

      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {FILTERS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setFilter(tab.key); }}
            className={cn(
              'filter-pill touch-feedback',
              filter === tab.key ? 'filter-pill-active' : 'filter-pill-inactive',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {pendingCount > 0 ? (
        <div className="mx-4 mb-4 rounded-card border border-amber-200/80 bg-amber-50/90 px-4 py-3.5">
          <p className="text-sm font-medium text-amber-900">
            {pendingCount} sipariş gönderilmeyi bekliyor
          </p>
          <Button
            className="mt-3"
            size="sm"
            fullWidth
            onClick={() => void handleSyncPending()}
            isLoading={isSyncing}
          >
            Bekleyen Siparişleri Gönder
          </Button>
        </div>
      ) : null}

      <div className="space-y-3 px-4 pb-4">
        {lastReport ? <SyncReportCard report={lastReport} /> : null}

        {isLoading ? (
          <LoadingSpinner label="Siparişler yükleniyor..." />
        ) : orders.length === 0 ? (
          <EmptyState
            title={
              filter === 'all' ? 'Henüz sipariş yok' : 'Bu filtrede sipariş yok'
            }
            description="Yeni Sipariş ekranından sipariş oluşturabilirsiniz."
          />
        ) : (
          <div className="space-y-2.5">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onSelect={(o) =>
                  void navigate(ROUTES.ORDER_DETAIL.replace(':id', o.id))
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
