import { useMemo } from 'react';
import { useDataStats } from '@/features/sync/hooks/useDataStats';
import { useSyncStore } from '@/stores/syncStore';
import { useOfflineStore } from '@/stores/offlineStore';
import { formatLastSyncLabel } from '@/features/sync/utils/lastSyncFormat';
import {
  resolveSyncStatus,
  type SyncRowStatus,
} from '@/features/sync/utils/resolveSyncStatus';
import { cn } from '@/shared/utils/cn';

interface SyncStatusPanelProps {
  compact?: boolean;
  showUsers?: boolean;
  isSyncing?: boolean;
  isInitialSyncing?: boolean;
}

interface SyncRowConfig {
  key: 'customers' | 'products' | 'users';
  label: string;
  count: number;
  warnWhenEmpty: boolean;
}

const STATUS_LABELS: Record<SyncRowStatus, string> = {
  syncing: 'Senkronize ediliyor...',
  success: 'Güncel ✓',
  failed: 'Senkronizasyon başarısız',
  offline: 'Çevrimdışı',
  pending: 'Henüz senkronize edilmedi',
  empty: 'Veri yok',
};

const STATUS_ICON: Record<SyncRowStatus, string> = {
  syncing: '🟡',
  success: '🟢',
  failed: '🔴',
  offline: '🔴',
  pending: '🟡',
  empty: '🟠',
};

const STATUS_TONE: Record<SyncRowStatus, string> = {
  syncing: 'text-amber-700',
  success: 'text-emerald-700',
  failed: 'text-red-700',
  offline: 'text-brand-gray-600',
  pending: 'text-brand-gray-500',
  empty: 'text-amber-700',
};

function SyncStatusRow({
  label,
  count,
  status,
  lastSyncLabel,
  compact,
}: {
  label: string;
  count: number;
  status: SyncRowStatus;
  lastSyncLabel: string;
  compact?: boolean;
}) {
  const detail =
    status === 'syncing'
      ? 'Veriler güncelleniyor...'
      : status === 'empty'
        ? `${lastSyncLabel} · 0 kayıt — Excel import / Firestore aktarım gerekli`
        : `${lastSyncLabel} · ${String(count)} kayıt`;

  return (
    <div
      className={cn(
        'rounded-xl border border-brand-gray-100 bg-brand-gray-50/70',
        compact ? 'px-3 py-2.5' : 'px-3.5 py-3',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('font-medium text-brand-navy', compact ? 'text-sm' : 'text-base')}>
            {STATUS_ICON[status]} {label}
          </p>
          <p className={cn('mt-1 text-brand-gray-500', compact ? 'text-[11px]' : 'text-xs')}>
            {detail}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 font-semibold',
            STATUS_TONE[status],
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
    </div>
  );
}

export function SyncStatusPanel({
  compact = false,
  showUsers = true,
  isSyncing = false,
  isInitialSyncing = false,
}: SyncStatusPanelProps) {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const lastReport = useSyncStore((s) => s.lastReport);
  const storeSyncing = useSyncStore((s) => s.isSyncing);
  const storeInitialSyncing = useSyncStore((s) => s.isInitialSyncing);
  const { stats, isLoading } = useDataStats();

  const syncing = isSyncing || isInitialSyncing || storeSyncing || storeInitialSyncing;
  const lastSyncLabel = useMemo(() => formatLastSyncLabel(lastSyncAt), [lastSyncAt]);

  const rows: SyncRowConfig[] = useMemo(() => {
    if (!stats) {
      return showUsers
        ? [
            { key: 'customers', label: 'Cari Kartları', count: 0, warnWhenEmpty: true },
            { key: 'products', label: 'Stok Kartları', count: 0, warnWhenEmpty: true },
            { key: 'users', label: 'Kullanıcılar', count: 0, warnWhenEmpty: false },
          ]
        : [
            { key: 'customers', label: 'Cari Kartları', count: 0, warnWhenEmpty: true },
            { key: 'products', label: 'Stok Kartları', count: 0, warnWhenEmpty: true },
          ];
    }

    const base: SyncRowConfig[] = [
      {
        key: 'customers',
        label: 'Cari Kartları',
        count: stats.customerCount,
        warnWhenEmpty: true,
      },
      {
        key: 'products',
        label: 'Stok Kartları',
        count: stats.productCount,
        warnWhenEmpty: true,
      },
    ];

    if (showUsers) {
      base.push({
        key: 'users',
        label: 'Kullanıcılar',
        count: stats.userCount,
        warnWhenEmpty: false,
      });
    }

    return base;
  }, [showUsers, stats]);

  if (isLoading && !stats) {
    return (
      <p className={cn('text-brand-gray-500', compact ? 'text-xs' : 'text-sm')}>
        Veri durumu yükleniyor...
      </p>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      {rows.map((row) => {
        const status = resolveSyncStatus({
          isOnline,
          isSyncing: syncing,
          isInitialSyncing: false,
          lastSyncAt,
          lastReportSuccess: lastReport ? lastReport.success : null,
          count: row.count,
          warnWhenEmpty: row.warnWhenEmpty,
        });

        return (
          <SyncStatusRow
            key={row.key}
            label={row.label}
            count={row.count}
            status={status}
            lastSyncLabel={lastSyncLabel}
            compact={compact}
          />
        );
      })}
    </div>
  );
}
