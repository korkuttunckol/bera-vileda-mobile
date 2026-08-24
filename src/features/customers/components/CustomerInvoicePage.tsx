import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BackButton } from '@/shared/components/layout/BackButton';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { formatCurrency } from '@/shared/utils/cn';
import { ROUTES } from '@/shared/constants/routes';
import { useCustomer } from '../hooks/useCustomer';
import {
  fetchLogoFatura,
  LogoFaturaApiError,
  type LogoFatura,
} from '../services/logoFaturaApiClient';
import { formatLogoDate } from '../utils/logoDateFormat';

function asNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const result = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(result) ? result : 0;
}

function discountPercentageText(line: LogoFatura['lines'][number]): string | null {
  const rates = line.ISKONTO_ORANLARI?.trim();
  if (rates) return rates;
  const percentage = asNumber(line.ISKONTO_ORANI);
  if (percentage <= 0) return null;
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(percentage);
}

export function CustomerInvoicePage() {
  const { id, invoiceRef } = useParams<{ id: string; invoiceRef: string }>();
  const { customer, isLoading: customerLoading } = useCustomer(id);
  const [invoice, setInvoice] = useState<LogoFatura | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvoice = useCallback(async (customerCode: string, document: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setInvoice(await fetchLogoFatura(customerCode, document));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setInvoice(null);
      setError(err instanceof LogoFaturaApiError ? err.message : 'Fatura yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!customer?.code || !invoiceRef) return;
    void loadInvoice(customer.code, invoiceRef);
  }, [customer?.code, invoiceRef, loadInvoice]);

  if (customerLoading) return <LoadingSpinner fullPage label="Cari yükleniyor..." />;
  if (!customer || !invoiceRef) {
    return <EmptyState title="Fatura bulunamadı" description="Fatura bilgisi eksik veya silinmiş." />;
  }

  const backTo = ROUTES.CUSTOMER_STATEMENT.replace(':id', customer.id);
  const header = invoice?.invoice;

  return (
    <div>
      <PageHeader
        title="Satış Faturası"
        subtitle={header?.BELGE_NO || header?.FIS_NO || 'Fatura ayrıntısı'}
        backButton={<BackButton to={backTo} />}
      />
      <div className="page-content space-y-3">
        {isLoading ? <LoadingSpinner label="Fatura yükleniyor..." /> : null}
        {error ? <EmptyState title="Fatura yüklenemedi" description={error} /> : null}
        {invoice && header ? (
          <>
            <Card padding="md" className="space-y-3">
              <div className="flex items-start justify-between gap-4 border-b border-brand-gray-100 pb-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-gray-500">Sayın</p>
                  <p className="mt-1 truncate text-base font-bold text-brand-navy">{header.CARI_AD || customer.name}</p>
                  <p className="text-sm text-brand-gray-500">Cari kodu: {header.CARI_KOD || customer.code}</p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p className="font-semibold text-brand-navy">{header.BELGE_NO || '—'}</p>
                  <p className="text-brand-gray-500">{formatLogoDate(header.TARIH) || '—'}</p>
                </div>
              </div>
              {header.ACIKLAMA_1 ? <p className="text-sm text-brand-gray-600">{header.ACIKLAMA_1}</p> : null}
            </Card>

            <Card padding="none" className="overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 bg-brand-navy px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">
                <span>Malzeme / Açıklama</span><span>Miktar</span><span className="text-right">Tutar</span>
              </div>
              {invoice.lines.map((line, index) => {
                const discountPercentage = discountPercentageText(line);
                return (
                <div key={String(line.SATIR_LOGICALREF ?? index)} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 border-b border-brand-gray-100 px-3 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-navy">{line.URUN_ADI || line.ACIKLAMA || 'Ürün'}</p>
                    {line.URUN_KODU ? <p className="text-xs text-brand-gray-500">{line.URUN_KODU}</p> : null}
                    <p className="mt-1 whitespace-nowrap text-[11px] tracking-tight text-brand-gray-500">
                      {formatCurrency(asNumber(line.BIRIM_FIYAT))}
                      {discountPercentage ? ` · İsk. %${discountPercentage}` : ''}
                      {' · '}KDV %{asNumber(line.KDV_ORANI)}
                    </p>
                  </div>
                  <p className="pt-0.5 text-sm tabular-nums text-brand-gray-700">{asNumber(line.MIKTAR)}</p>
                  <p className="pt-0.5 text-right text-sm font-semibold tabular-nums text-brand-navy">{formatCurrency(asNumber(line.NET_TUTAR))}</p>
                </div>
                );
              })}
            </Card>

            <Card padding="md" className="ml-auto max-w-sm space-y-2 text-sm tabular-nums">
              <div className="flex justify-between gap-6 text-brand-gray-600"><span>Brüt toplam</span><span>{formatCurrency(asNumber(header.BRUT_TOPLAM))}</span></div>
              {asNumber(header.TOPLAM_ISKONTO) > 0 ? <div className="flex justify-between gap-6 text-brand-gray-600"><span>İskonto</span><span>-{formatCurrency(asNumber(header.TOPLAM_ISKONTO))}</span></div> : null}
              <div className="flex justify-between gap-6 text-brand-gray-600"><span>KDV</span><span>{formatCurrency(asNumber(header.TOPLAM_KDV))}</span></div>
              <div className="flex justify-between gap-6 border-t border-brand-gray-200 pt-2 text-base font-bold text-brand-navy"><span>Genel toplam</span><span>{formatCurrency(asNumber(header.GENEL_TOPLAM))}</span></div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
