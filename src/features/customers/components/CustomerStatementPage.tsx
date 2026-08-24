import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useCustomer } from '../hooks/useCustomer';
import {
  fetchLogoCariHareketRows,
  LogoCariHareketApiError,
  type LogoCariHareketRow,
} from '../services/logoCariHareketApiClient';
import { ROUTES } from '@/shared/constants/routes';
import { formatCurrency } from '@/shared/utils/cn';
import { toast } from '@/stores/toastStore';
import { shareCustomerStatementPdf } from '../services/customerStatementPdfService';
import { formatLogoDate } from '../utils/logoDateFormat';

function asNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function formatMovementDate(row: LogoCariHareketRow): string {
  const date = row.TARIH ?? '';
  const time = row.SAAT ?? '';
  const formattedDate = formatLogoDate(date);
  if (formattedDate && time) return `${formattedDate} ${time}`;
  return formattedDate || time || '—';
}

export function CustomerStatementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customer, isLoading: customerLoading } = useCustomer(id);
  const [rows, setRows] = useState<LogoCariHareketRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadStatement = useCallback(async (customerCode: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLogoCariHareketRows(customerCode);
      setRows(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setRows([]);
      setError(
        err instanceof LogoCariHareketApiError
          ? err.message
          : 'Hesap ekstresi yüklenemedi.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!customer?.code) return;
    void loadStatement(customer.code);
  }, [customer?.code, loadStatement]);

  if (customerLoading) {
    return <LoadingSpinner fullPage label="Cari yükleniyor..." />;
  }

  if (!customer) {
    return (
      <EmptyState
        title="Cari bulunamadı"
        description="Kayıt silinmiş veya erişilemiyor olabilir."
      />
    );
  }

  const backTo = ROUTES.CUSTOMER_ACTIONS.replace(':id', customer.id);

  const handlePdfExport = async (): Promise<void> => {
    setIsExporting(true);
    try {
      const wasShared = await shareCustomerStatementPdf(customer, rows);
      if (wasShared) toast('Hesap ekstresi PDF olarak hazırlandı.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'PDF oluşturulamadı.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Hesap Ekstresi"
        subtitle={`${customer.code} · ${customer.name}`}
        backButton={<BackButton to={backTo} />}
      />

      <div className="page-content space-y-3">
        {isLoading ? (
          <LoadingSpinner label="Hareketler yükleniyor..." />
        ) : error ? (
          <EmptyState title="Ekstre yüklenemedi" description={error} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Hareket bulunamadı"
            description="Bu cari için kayıtlı hareket yok veya API yanıtı boş."
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="section-label">{rows.length} hareket</p>
              <Button
                variant="outline"
                size="sm"
                isLoading={isExporting}
                onClick={() => void handlePdfExport()}
              >
                PDF Oluştur
              </Button>
            </div>
            <div className="list-stack">
              {rows.map((row, index) => {
                const key = String(row.HAREKET_LOGICALREF ?? index);
                const borc = asNumber(row.BORC);
                const alacak = asNumber(row.ALACAK);
                const bakiye = asNumber(row.BAKIYE);
                const invoiceRef = row.FATURA_LOGICALREF;
                const invoiceLabel = row.FATURA_BELGE_NO?.trim() || row.FATURA_FIS_NO?.trim();
                const bankDescription = row.BANKA_ACIKLAMA?.trim();
                const bankSlipDescription = row.BANKA_FIS_ACIKLAMA?.trim();
                const isCreditCardCollection = Number(row.FIS_TURU) === 70;
                const title = invoiceRef
                  ? invoiceLabel || row.ACIKLAMA?.trim() || row.BELGE_NO?.trim() || 'Satış faturası'
                  : row.ACIKLAMA?.trim() ||
                    (isCreditCardCollection ? 'Kredi Kartı Tahsilatı' : bankDescription) ||
                    row.BELGE_NO?.trim() ||
                    '—';
                return (
                  <Card key={key} padding="sm" className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-brand-gray-500">
                          {formatMovementDate(row)}
                        </p>
                        <p className="truncate font-semibold text-brand-navy">
                          {title}
                        </p>
                        {!invoiceRef && row.BELGE_NO ? (
                          <p className="text-xs text-brand-gray-400">
                            Belge: {row.BELGE_NO}
                          </p>
                        ) : null}
                        {!invoiceRef && !isCreditCardCollection && bankSlipDescription ? (
                          <p className="mt-1 line-clamp-2 text-xs text-brand-gray-500">
                            {bankSlipDescription}
                          </p>
                        ) : null}
                        {invoiceRef ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                ROUTES.CUSTOMER_INVOICE
                                  .replace(':id', customer.id)
                                  .replace(':invoiceRef', encodeURIComponent(String(invoiceRef))),
                              )
                            }
                            className="mt-2 text-xs font-semibold text-brand-navy underline underline-offset-2"
                          >
                            Faturayı görüntüle
                          </button>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right text-xs tabular-nums">
                        {borc > 0 ? (
                          <p className="text-red-600">B: {formatCurrency(borc)}</p>
                        ) : null}
                        {alacak > 0 ? (
                          <p className="text-emerald-700">
                            A: {formatCurrency(alacak)}
                          </p>
                        ) : null}
                        <p className="font-semibold text-brand-navy">
                          {formatCurrency(bakiye)}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
