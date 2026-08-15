import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { isLogoCustomersApiConfigured } from '@/config/env';
import { cn } from '@/shared/utils/cn';
import { SettingsBackButton } from './SettingsBackButton';
import {
  logoCustomerSyncService,
  type LogoCustomerSyncReport,
} from '../services/logoCustomerSyncService';
import {
  LOGO_LAN_TEST_SALES_REP_CODE,
  loadLogoSalesRepDiagnostic,
  safetyCountsUnchanged,
  snapshotLogoCustomerSyncSafetyCounts,
  type LogoCustomerSyncSafetyCounts,
  type LogoSalesRepDiagnostic,
} from '../services/logoCustomerSyncDiagnostics';

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: 'green' | 'red' | 'amber';
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-gray-100 py-2 last:border-0">
      <span className="text-brand-gray-600">{label}</span>
      <span
        className={cn(
          'font-semibold tabular-nums text-brand-navy',
          highlight === 'green' && 'text-emerald-600',
          highlight === 'red' && 'text-red-600',
          highlight === 'amber' && 'text-amber-600',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatSyncTime(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

export function LogoCustomerSyncPage() {
  const user = useAuthStore((s) => s.user);
  const apiConfigured = isLogoCustomersApiConfigured();

  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<LogoCustomerSyncReport | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>();
  const [salesRepDiag, setSalesRepDiag] =
    useState<LogoSalesRepDiagnostic | null>(null);
  const [safetyBefore, setSafetyBefore] =
    useState<LogoCustomerSyncSafetyCounts | null>(null);
  const [safetyAfter, setSafetyAfter] =
    useState<LogoCustomerSyncSafetyCounts | null>(null);

  const refreshMeta = useCallback(async () => {
    const at = await logoCustomerSyncService.getLastSyncAt();
    setLastSyncAt(at);
  }, []);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  const handleSync = async (): Promise<void> => {
    if (!apiConfigured) {
      toast(
        'Logo cari API URL yapılandırılmamış (VITE_LOGO_CUSTOMERS_API_URL).',
        'error',
      );
      return;
    }

    setIsLoading(true);
    setReport(null);
    setSalesRepDiag(null);
    setSafetyAfter(null);

    try {
      const before = await snapshotLogoCustomerSyncSafetyCounts();
      setSafetyBefore(before);

      const result = await logoCustomerSyncService.syncToIndexedDB({
        userId: user?.uid ?? 'logo-customer-sync',
      });
      setReport(result);

      const after = await snapshotLogoCustomerSyncSafetyCounts();
      setSafetyAfter(after);

      const diag = await loadLogoSalesRepDiagnostic(
        LOGO_LAN_TEST_SALES_REP_CODE,
      );
      setSalesRepDiag(diag);

      await refreshMeta();

      if (result.success) {
        toast(
          `Logo cari sync tamamlandı — ${String(result.created)} yeni, ${String(result.updated)} güncellendi`,
          result.conflicts.length > 0 || result.errors.length > 0
            ? 'warning'
            : 'success',
        );
      } else {
        toast(
          result.errors[0] ?? 'Logo cari sync başarısız. Yerel veriler korundu.',
          'error',
        );
      }
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Logo cari sync başarısız',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const safetyOk =
    safetyBefore && safetyAfter
      ? safetyCountsUnchanged(safetyBefore, safetyAfter)
      : null;

  return (
    <div>
      <PageHeader
        title="Logo'dan Cari Verilerini Al"
        subtitle="CLCARD → yerel IndexedDB (Firestore'a otomatik push yok)"
        backButton={<SettingsBackButton />}
      />
      <div className="space-y-4 p-4">
        <Card padding="md" className="space-y-3">
          <p className="text-sm text-brand-gray-600">
            Logo CLCARD master data bu cihaza alınır. Mevcut yerel cariler
            silinmez; eşleşenler güncellenir, yeniler eklenir. Şube, sipariş ve
            outbox dokunulmaz.
          </p>
          <p className="text-xs text-brand-gray-400">
            SPECODE → logoSalesRepCode (satış elemanı). salesRepId ve
            CustomerBranch ile karıştırılmaz. ORFICHE.SPECODE = BERA şube adı.
          </p>
          <p className="text-xs text-brand-gray-500">
            API:{' '}
            {apiConfigured ? (
              <span className="font-medium text-emerald-700">yapılandırıldı</span>
            ) : (
              <span className="font-medium text-red-600">
                yapılandırılmadı (VITE_LOGO_CUSTOMERS_API_URL)
              </span>
            )}
          </p>
          <p className="text-xs text-brand-gray-500">
            Son başarılı sync: {formatSyncTime(lastSyncAt)}
          </p>
          <Button
            fullWidth
            isLoading={isLoading}
            disabled={!apiConfigured}
            onClick={() => void handleSync()}
          >
            Logo&apos;dan Cari Verilerini Al
          </Button>
        </Card>

        {report ? (
          <Card padding="md" className="space-y-3">
            <h2 className="text-sm font-semibold text-brand-navy">Sync özeti</h2>
            <div className="text-sm">
              <SummaryRow
                label="Durum"
                value={report.success ? 'Başarılı' : 'Hata'}
                highlight={report.success ? 'green' : 'red'}
              />
              <SummaryRow
                label="Logo'dan alınan toplam kayıt"
                value={report.fetchedRows}
              />
              <SummaryRow
                label="Yeni cari"
                value={report.created}
                highlight="green"
              />
              <SummaryRow label="Güncellenen cari" value={report.updated} />
              <SummaryRow
                label="Conflict"
                value={report.conflicts.length}
                highlight={
                  report.conflicts.length > 0 ? 'amber' : undefined
                }
              />
              <SummaryRow
                label="Atlanan"
                value={report.skipped}
              />
              <SummaryRow
                label="Hata"
                value={report.errors.length}
                highlight={report.errors.length > 0 ? 'red' : undefined}
              />
              <SummaryRow
                label="Son başarılı sync zamanı"
                value={formatSyncTime(
                  report.success ? report.startedAt : lastSyncAt,
                )}
              />
            </div>
            {report.errors.length > 0 ? (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-800">
                {report.errors.map((msg) => (
                  <p key={msg}>{msg}</p>
                ))}
              </div>
            ) : null}
            {report.conflicts.length > 0 ? (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                {report.conflicts.slice(0, 20).map((c) => (
                  <p key={`${c.type}-${c.erpId}-${c.code}`}>
                    [{c.type}] {c.code} / {c.erpId}: {c.message}
                  </p>
                ))}
                {report.conflicts.length > 20 ? (
                  <p>… +{report.conflicts.length - 20} conflict daha</p>
                ) : null}
              </div>
            ) : null}
          </Card>
        ) : null}

        {salesRepDiag ? (
          <Card padding="md" className="space-y-3">
            <h2 className="text-sm font-semibold text-brand-navy">
              Doğrulama — SPECODE / logoSalesRepCode ={' '}
              {salesRepDiag.logoSalesRepCode}
            </h2>
            <p className="text-sm text-brand-gray-600">
              Yerel carilerde bu satış elemanı koduna sahip kayıt:{' '}
              <span className="font-semibold tabular-nums text-brand-navy">
                {salesRepDiag.count}
              </span>
            </p>
            {salesRepDiag.samples.length > 0 ? (
              <ul className="max-h-48 space-y-2 overflow-y-auto text-xs text-brand-gray-700">
                {salesRepDiag.samples.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-brand-gray-100 bg-brand-gray-50/80 px-3 py-2"
                  >
                    <span className="font-semibold text-brand-navy">
                      {s.code}
                    </span>
                    {' — '}
                    {s.name}
                    {s.erpId ? (
                      <span className="text-brand-gray-400">
                        {' '}
                        (erpId={s.erpId})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-brand-gray-500">
                Henüz logoSalesRepCode={salesRepDiag.logoSalesRepCode} olan
                cari yok (sync sonrası görünmeli).
              </p>
            )}
          </Card>
        ) : null}

        {safetyBefore && safetyAfter ? (
          <Card padding="md" className="space-y-3">
            <h2 className="text-sm font-semibold text-brand-navy">
              Güvenlik kontrolü (değişmemeli)
            </h2>
            <p
              className={cn(
                'text-sm font-medium',
                safetyOk ? 'text-emerald-700' : 'text-red-600',
              )}
            >
              {safetyOk
                ? 'CustomerBranch / Order / OrderLine / Outbox sayıları değişmedi.'
                : 'Uyarı: yan tablolarda sayı değişimi tespit edildi.'}
            </p>
            <div className="text-sm">
              <SummaryRow
                label="CustomerBranch"
                value={`${String(safetyBefore.branches)} → ${String(safetyAfter.branches)}`}
                highlight={
                  safetyBefore.branches === safetyAfter.branches
                    ? 'green'
                    : 'red'
                }
              />
              <SummaryRow
                label="Order"
                value={`${String(safetyBefore.orders)} → ${String(safetyAfter.orders)}`}
                highlight={
                  safetyBefore.orders === safetyAfter.orders ? 'green' : 'red'
                }
              />
              <SummaryRow
                label="OrderLine"
                value={`${String(safetyBefore.orderLines)} → ${String(safetyAfter.orderLines)}`}
                highlight={
                  safetyBefore.orderLines === safetyAfter.orderLines
                    ? 'green'
                    : 'red'
                }
              />
              <SummaryRow
                label="Outbox (syncQueue)"
                value={`${String(safetyBefore.outbox)} → ${String(safetyAfter.outbox)}`}
                highlight={
                  safetyBefore.outbox === safetyAfter.outbox ? 'green' : 'red'
                }
              />
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
