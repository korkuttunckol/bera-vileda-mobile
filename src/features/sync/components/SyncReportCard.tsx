import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { computeOrderSyncStats } from '@/shared/lib/sync/orderSyncStats';
import { ROUTES } from '@/shared/constants/routes';
import type { SyncReport } from '@/shared/lib/sync/types/sync.types';
import { cn } from '@/shared/utils/cn';

interface SyncReportCardProps {
  report: SyncReport;
  variant?: 'compact' | 'full';
  detailHref?: string;
}

const triggerLabels: Record<SyncReport['trigger'], string> = {
  manual: 'Manuel',
  auto: 'Otomatik',
  online_reconnect: 'Bağlantı yeniden kuruldu',
};

interface SyncStats {
  sent: number;
  pending: number;
  failed: number;
  sending: number;
}

function useSyncReportStats(report: SyncReport): SyncStats {
  const { orders } = useOrders('all');

  return useMemo(() => {
    if (orders.length > 0) {
      return computeOrderSyncStats(orders);
    }
    return {
      sent: report.orders?.sent ?? report.push.synced,
      pending: report.orders?.pending ?? report.push.pending,
      failed: report.orders?.failed ?? report.push.failed,
      sending: report.orders?.sending ?? 0,
    };
  }, [orders, report]);
}

const STAT_ITEMS = [
  { key: 'sent', label: 'Gönderilen', tone: 'text-brand-navy' },
  { key: 'success', label: 'Başarılı', tone: 'text-green-600' },
  { key: 'failed', label: 'Başarısız', tone: 'text-red-600' },
  { key: 'pending', label: 'Bekleyen', tone: 'text-yellow-600' },
] as const;

function StatGrid({
  stats,
  compact,
}: {
  stats: SyncStats;
  compact?: boolean;
}) {
  const pendingCount = stats.pending + stats.sending;
  const values = {
    sent: stats.sent,
    success: stats.sent,
    failed: stats.failed,
    pending: pendingCount,
  };

  return (
    <div className={cn('grid grid-cols-4', compact ? 'gap-1.5' : 'gap-2.5')}>
      {STAT_ITEMS.map((item) => (
        <div
          key={item.key}
          className={cn(
            'rounded-xl bg-brand-gray-50 text-center',
            compact ? 'px-1.5 py-2' : 'p-3',
          )}
        >
          <p
            className={cn(
              'font-bold',
              item.tone,
              compact ? 'text-base leading-none' : 'text-lg',
            )}
          >
            {values[item.key]}
          </p>
          <p
            className={cn(
              'text-brand-gray-500',
              compact ? 'mt-1 text-[10px] leading-tight' : 'text-xs',
            )}
          >
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function SyncReportErrors({
  errors,
  compact,
}: {
  errors: SyncReport['errors'];
  compact?: boolean;
}) {
  if (errors.length === 0) return null;

  if (compact) {
    return (
      <p className="text-[11px] font-medium text-red-600">
        {errors.length} hata kaydedildi
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-xl bg-red-50 p-3">
      <p className="text-xs font-medium text-red-700">Hatalar:</p>
      {errors.map((error) => (
        <p key={error.idempotencyKey} className="text-xs text-red-600">
          {error.message}
        </p>
      ))}
    </div>
  );
}

export function SyncReportCard({
  report,
  variant = 'full',
  detailHref = ROUTES.ORDER_HISTORY,
}: SyncReportCardProps) {
  const navigate = useNavigate();
  const stats = useSyncReportStats(report);
  const date = new Date(report.completedAt).toLocaleString('tr-TR');
  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <Card padding="none" className="px-3 py-2.5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-brand-navy">
              Senkronizasyon Raporu
            </h3>
            <p className="mt-0.5 text-[10px] leading-snug text-brand-gray-400">
              Son senkron: {date}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-gray-100 px-2 py-0.5 text-[10px] font-semibold text-brand-navy">
            {triggerLabels[report.trigger]}
          </span>
        </div>

        <StatGrid stats={stats} compact />

        <div className="mt-2 flex items-center justify-between gap-2">
          <SyncReportErrors errors={report.errors} compact />
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7 shrink-0 px-2 text-xs"
            onClick={() => void navigate(detailHref)}
          >
            Detayları Gör
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Senkronizasyon Raporu" subtitle={date} />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-brand-gray-500">Tetikleyici</span>
          <span className="font-medium text-brand-navy">
            {triggerLabels[report.trigger]}
          </span>
        </div>
        <StatGrid stats={stats} />
        <SyncReportErrors errors={report.errors} />
      </div>
    </Card>
  );
}
