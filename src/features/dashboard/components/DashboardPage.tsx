import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOfflineStore } from '@/stores/offlineStore';
import { useSync, SyncReportCard } from '@/features/sync';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useCustomers } from '@/features/customers/hooks/useCustomers';
import { useProducts } from '@/features/products/hooks/useProducts';
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

interface SyncStatusInfo {
  dotClass: string;
  label: string;
  detail: string;
}

function getSyncStatusInfo(
  isOnline: boolean,
  isSyncing: boolean,
  pendingCount: number,
): SyncStatusInfo {
  if (!isOnline) {
    return {
      dotClass: 'bg-amber-400',
      label: 'Çevrimdışı',
      detail:
        pendingCount > 0
          ? `${String(pendingCount)} sipariş kuyrukta`
          : 'Bağlantı gelince senkronize edilir',
    };
  }
  if (isSyncing) {
    return {
      dotClass: 'bg-blue-400 animate-pulse',
      label: 'Senkronize ediliyor',
      detail: 'Siparişler gönderiliyor…',
    };
  }
  if (pendingCount > 0) {
    return {
      dotClass: 'bg-amber-400',
      label: 'Bekleyen gönderim',
      detail: `${String(pendingCount)} sipariş senkron bekliyor`,
    };
  }
  return {
    dotClass: 'bg-emerald-400',
    label: 'Güncel',
    detail: 'Tüm siparişler senkronize',
  };
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
  const isOnline = useOfflineStore((s) => s.isOnline);
  const pendingSyncCount = useOfflineStore((s) => s.pendingSyncCount);
  const { isSyncing, lastReport, syncNow } = useSync();
  const { orders } = useOrders('all');
  const { customers } = useCustomers('', 'all');
  const { products } = useProducts('');

  const todayLabel = useMemo(() => formatDashboardDate(new Date()), []);

  const syncStatus = useMemo(
    () => getSyncStatusInfo(isOnline, isSyncing, pendingSyncCount),
    [isOnline, isSyncing, pendingSyncCount],
  );

  const todayOrderCount = useMemo(
    () => orders.filter((o) => isToday(o.orderDate)).length,
    [orders],
  );

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.orderSyncStatus === 'pending_offline' ||
          o.orderSyncStatus === 'failed',
      ).length,
    [orders],
  );

  const displayName = user?.displayName ?? 'Kullanıcı';
  const roleLabel = user ? USER_ROLE_LABELS[user.role] : '';

  return (
    <div className="pb-2">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy-dark via-brand-navy to-brand-navy-light px-4 pb-10 pt-6 shadow-header">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12)_0%,_transparent_55%)]" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.07]" />
        <div className="pointer-events-none absolute -bottom-8 left-0 h-32 w-32 rounded-full bg-white/[0.05]" />

        <div className="relative space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-lg font-bold text-white shadow-lg backdrop-blur-sm">
                {getUserInitials(displayName)}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                  Hoş geldiniz
                </p>
                <h1 className="truncate text-xl font-bold tracking-tight text-white">
                  {displayName}
                </h1>
                {roleLabel ? (
                  <p className="truncate text-sm text-white/70">{roleLabel}</p>
                ) : null}
                {user?.email ? (
                  <p className="truncate text-xs text-white/50">{user.email}</p>
                ) : null}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0 border-white/10 bg-white/15 text-white hover:bg-white/25"
              onClick={() => void syncNow('manual')}
              isLoading={isSyncing}
            >
              <span className="flex items-center gap-1.5">
                <Icon name="sync" size="sm" className={isSyncing ? 'animate-spin' : undefined} />
                Sync
              </span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
              <svg className="h-3.5 w-3.5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="capitalize">{todayLabel}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn('h-2.5 w-2.5 shrink-0 rounded-full shadow-sm', syncStatus.dotClass)}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{syncStatus.label}</p>
                <p className="truncate text-xs text-white/65">{syncStatus.detail}</p>
              </div>
            </div>
            {pendingSyncCount > 0 ? (
              <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white">
                {pendingSyncCount}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="relative -mt-5 space-y-4 px-4">
        <div className="grid grid-cols-2 gap-2">
          <StatCard value={todayOrderCount} label="Bugünkü Sipariş" icon="orders" />
          <StatCard
            value={pendingOrders}
            label="Bekleyen / Hatalı"
            icon="pending"
            accent={pendingOrders > 0 ? 'warning' : 'default'}
          />
          <StatCard value={customers.length} label="Toplam Müşteri" icon="customers" />
          <StatCard value={products.length} label="Toplam Ürün" icon="products" />
        </div>

        <Card padding="sm" className={DASHBOARD_CARD}>
          <h3 className="mb-2.5 text-base font-semibold tracking-tight text-brand-navy">
            Hızlı İşlemler
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <QuickActionTile
              label="Yeni Sipariş"
              icon="new-order"
              primary
              onClick={() => void navigate(ROUTES.NEW_ORDER)}
            />
            <QuickActionTile
              label="Müşteriler"
              icon="customers"
              onClick={() => void navigate(ROUTES.CUSTOMERS)}
            />
            <QuickActionTile
              label="Ürünler"
              icon="products"
              onClick={() => void navigate(ROUTES.PRODUCTS)}
            />
            <QuickActionTile
              label="Sipariş Geçmişi"
              icon="history"
              onClick={() => void navigate(ROUTES.ORDER_HISTORY)}
            />
          </div>
        </Card>

        {lastReport ? (
          <SyncReportCard report={lastReport} variant="compact" />
        ) : null}

        <Card className={DASHBOARD_CARD}>
          <CardHeader title="Senkronizasyon" subtitle="Offline sipariş yönetimi" />
          <p className="mb-4 text-sm leading-relaxed text-brand-gray-500">
            Offline siparişler internet geldiğinde otomatik gönderilir.
          </p>
          <Button
            fullWidth
            variant="outline"
            onClick={() => void syncNow('manual')}
            isLoading={isSyncing}
          >
            Şimdi Senkronize Et ({pendingSyncCount})
          </Button>
        </Card>
      </div>
    </div>
  );
}
