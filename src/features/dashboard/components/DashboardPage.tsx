import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useOfflineStore } from '@/stores/offlineStore';
import { useSyncStore } from '@/stores/syncStore';
import { usePendingSyncCount } from '@/features/sync/hooks/usePendingSyncCount';
import { useDataStats } from '@/features/sync/hooks/useDataStats';
import { useSync } from '@/features/sync/hooks/useSync';
import { formatLastSyncLabel } from '@/features/sync/utils/lastSyncFormat';
import { DataSourcePanel } from '@/features/sync/components/DataSourcePanel';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { ROUTES } from '@/shared/constants/routes';
import { USER_ROLE_LABELS } from '@/shared/types/role.types';
import { cn } from '@/shared/utils/cn';

const DASHBOARD_CARD =
  'shadow-card-elevated transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:scale-[0.995]';

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function formatDashboardDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.charAt(0).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

interface StatCardProps {
  value: number;
  label: string;
  icon: 'orders' | 'pending' | 'customers' | 'products';
  accent?: 'default' | 'warning';
}

function StatCard({ value, label, icon, accent = 'default' }: StatCardProps) {
  return (
    <Card
      padding="none"
      className={cn(DASHBOARD_CARD, 'relative overflow-hidden px-3 py-2.5')}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-1.5 -top-1.5 h-10 w-10 rounded-full opacity-35',
          accent === 'warning' ? 'bg-amber-200/60' : 'bg-brand-navy/10',
        )}
      />
      <div className="relative flex items-center gap-2.5">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
            accent === 'warning'
              ? 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700'
              : 'bg-gradient-to-br from-brand-navy/12 to-brand-navy/5 text-brand-navy',
          )}
        >
          <Icon name={icon} size="md" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[22px] font-bold leading-none tracking-tight text-brand-navy">
            {value}
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-snug text-brand-gray-500">
            {label}
          </p>
        </div>
      </div>
    </Card>
  );
}

interface QuickActionProps {
  label: string;
  icon: 'new-order' | 'customers' | 'products' | 'history';
  primary?: boolean;
  onClick: () => void;
}

function QuickActionTile({ label, icon, primary, onClick }: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'touch-feedback flex min-h-[76px] flex-col items-start justify-center gap-2 rounded-card border p-3 text-left',
        'shadow-card-elevated transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98]',
        primary
          ? 'border-white/20 bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-navy-muted text-white'
          : 'border-brand-gray-200/80 bg-white text-brand-navy',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl shadow-sm',
          primary ? 'bg-white/20 text-white' : 'bg-brand-navy/10 text-brand-navy',
        )}
      >
        <Icon name={icon} size="lg" />
      </span>
      <span className="text-sm font-semibold leading-snug">{label}</span>
    </button>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();
  const isOnline = useOfflineStore((s) => s.isOnline);
  const pendingSyncCount = usePendingSyncCount();
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const hasRemoteUpdates = useSyncStore((s) => s.hasRemoteUpdates);
  const { stats } = useDataStats();
  const { isSyncing, isInitialSyncing, syncNow } = useSync();
  const { orders } = useOrders('all');

  const todayLabel = useMemo(() => formatDashboardDate(new Date()), []);
  const lastSyncLabel = useMemo(() => formatLastSyncLabel(lastSyncAt), [lastSyncAt]);

  const todayOrderCount = useMemo(
    () => orders.filter((o) => isToday(o.orderDate)).length,
    [orders],
  );

  const displayName = user?.displayName ?? 'Kullanıcı';
  const roleLabel = user ? USER_ROLE_LABELS[user.role] : '';

  return (
    <div className="pb-2">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy-dark via-brand-navy to-brand-navy-light px-4 pb-8 pt-5 shadow-header">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_55%)]" />
        <div className="relative space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-base font-bold text-white shadow-lg backdrop-blur-sm">
                {getUserInitials(displayName)}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                  Hoş geldiniz
                </p>
                <h1 className="truncate text-lg font-bold tracking-tight text-white">
                  {displayName}
                </h1>
                {roleLabel ? (
                  <p className="truncate text-sm text-white/70">{roleLabel}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <svg className="h-4 w-4 shrink-0 text-white/75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="capitalize">{todayLabel}</span>
            </div>
            <div className="mt-2 space-y-1 text-sm text-white">
              <p>{isOnline ? '🟢 Online' : '🔴 Offline'}</p>
              <p className="text-white/90">
                Bekleyen Senkronizasyon : {pendingSyncCount}
              </p>
              <p className="text-white/80">Son Senkronizasyon : {lastSyncLabel}</p>
              {isInitialSyncing || isSyncing ? (
                <p className="text-white/75">Firestore verileri indiriliyor...</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {hasRemoteUpdates ? (
        <div className="mx-4 mt-3 rounded-card border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Yeni veri indirildi. Cari, stok ve kullanıcı sayıları güncellendi.
        </div>
      ) : null}

      <div className="relative -mt-4 space-y-3 px-4">
        <div className="grid grid-cols-2 gap-2">
          <StatCard value={todayOrderCount} label="Bugünkü Sipariş" icon="orders" />
          <StatCard
            value={pendingSyncCount}
            label="Bekleyen Senkronizasyon"
            icon="pending"
            accent={pendingSyncCount > 0 ? 'warning' : 'default'}
          />
          {can('manageCustomers') ? (
            <StatCard
              value={stats?.customerCount ?? 0}
              label="Cari Sayısı"
              icon="customers"
            />
          ) : null}
          {can('manageProducts') ? (
            <StatCard
              value={stats?.productCount ?? 0}
              label="Stok Sayısı"
              icon="products"
            />
          ) : null}
          {can('manageUsers') ? (
            <StatCard
              value={stats?.userCount ?? 0}
              label="Kullanıcı Sayısı"
              icon="customers"
            />
          ) : null}
        </div>

        {can('syncManagement') ? (
          <Card padding="md" className={DASHBOARD_CARD}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-brand-navy">
                  Veri Senkronizasyonu
                </h3>
                <p className="mt-1 text-xs text-brand-gray-500">
                  Mac ve iPhone aynı IndexedDB önbelleğini Firestore ile eşler.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                isLoading={isSyncing || isInitialSyncing}
                disabled={!isOnline}
                onClick={() => void syncNow('manual')}
              >
                Senkronize Et
              </Button>
            </div>
            <DataSourcePanel sources={stats?.sources ?? null} compact />
          </Card>
        ) : null}

        <Card padding="sm" className={DASHBOARD_CARD}>
          <h3 className="mb-2 text-base font-semibold tracking-tight text-brand-navy">
            Hızlı İşlemler
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <QuickActionTile
              label="Yeni Sipariş"
              icon="new-order"
              primary
              onClick={() => void navigate(ROUTES.NEW_ORDER)}
            />
            {can('manageCustomers') ? (
              <QuickActionTile
                label="Müşteriler"
                icon="customers"
                onClick={() => void navigate(ROUTES.CUSTOMERS)}
              />
            ) : null}
            {can('manageProducts') ? (
              <QuickActionTile
                label="Ürünler"
                icon="products"
                onClick={() => void navigate(ROUTES.PRODUCTS)}
              />
            ) : null}
            <QuickActionTile
              label="Sipariş Geçmişi"
              icon="history"
              onClick={() => void navigate(ROUTES.ORDER_HISTORY)}
            />
          </div>
        </Card>

        <footer className="pb-3 pt-1 text-center text-[11px] leading-relaxed text-brand-gray-400">
          <p className="font-medium text-brand-gray-500">BERA Vileda Sipariş Sistemi</p>
          <p>v1.1.0</p>
          <p>© 2026 Korkut Tunçkol</p>
        </footer>
      </div>
    </div>
  );
}
