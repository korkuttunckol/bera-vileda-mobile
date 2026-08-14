/**
 * DEV-only: Logo ORFICHE/ORFLINE export preview from IndexedDB (read-only).
 * Does not call Logo API, SQL, Firestore, outbox, or mutate orders.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SettingsBackButton } from './SettingsBackButton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { orderService } from '@/features/orders/services/orderService';
import { customerLocalRepository } from '@/shared/lib/indexeddb/repositories/customerRepository';
import { productLocalRepository } from '@/shared/lib/indexeddb/repositories/productRepository';
import { mapOrderToLogoExport } from '@/features/orders/utils/logoOrderExportMapper';
import type { LogoOrderExportResult } from '@/features/orders/utils/logoOrderExport.types';
import type { Order, OrderLine } from '@/shared/types/order.types';
import { cn } from '@/shared/utils/cn';

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

function FieldRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-2 border-b border-brand-gray-100 py-1.5 text-sm last:border-b-0">
      <dt className="text-brand-gray-500">{label}</dt>
      <dd className="min-w-0 break-all font-mono text-brand-navy">{value}</dd>
    </div>
  );
}

export function LogoExportPreviewPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedLines, setSelectedLines] = useState<OrderLine[]>([]);
  const [exportResult, setExportResult] = useState<LogoOrderExportResult | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    setLoadError(null);
    try {
      const list = await orderService.list(user.uid, user.role, 'all');
      setOrders(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Siparişler okunamadı');
      setOrders([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const lineById = useMemo(() => {
    const map = new Map<string, OrderLine>();
    for (const line of selectedLines) map.set(line.id, line);
    return map;
  }, [selectedLines]);

  const handleSelectOrder = async (orderId: string): Promise<void> => {
    setSelectedId(orderId);
    setPreviewLoading(true);
    setExportResult(null);
    setLoadError(null);
    try {
      const [order, lines, customers, products] = await Promise.all([
        orderService.getById(orderId),
        orderService.getLines(orderId),
        customerLocalRepository.getAll(),
        productLocalRepository.getAll(),
      ]);

      if (!order) {
        setSelectedOrder(null);
        setSelectedLines([]);
        setLoadError('Sipariş bulunamadı (silinmiş olabilir).');
        return;
      }

      setSelectedOrder(order);
      setSelectedLines(lines);

      // Pure map only — no Logo API / SQL / Firestore / outbox / mutations.
      const result = mapOrderToLogoExport({
        order,
        lines,
        customers,
        products,
      });
      setExportResult(result);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Önizleme oluşturulamadı');
      setExportResult(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const clearSelection = (): void => {
    setSelectedId(null);
    setSelectedOrder(null);
    setSelectedLines([]);
    setExportResult(null);
    setLoadError(null);
  };

  return (
    <div>
      <PageHeader
        title="Logo Aktarım Önizleme (DEV)"
        subtitle="Salt okuma — Logo/SQL/Firestore yazılmaz"
        backButton={<SettingsBackButton />}
      />

      <div className="space-y-4 p-4 pb-8">
        <Card padding="md" className="border border-amber-200 bg-amber-50/80">
          <p className="text-sm font-medium text-amber-950">
            Geliştirici önizlemesi. IndexedDB okur; sipariş silinmez/güncellenmez;
            Logo API, SQL, Excel, Outbox ve Firestore kullanılmaz.
          </p>
        </Card>

        {listLoading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="Sipariş yok"
            description="Bu kullanıcı için IndexedDB’de görüntülenecek sipariş bulunamadı."
          />
        ) : (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-gray-400">
              Sipariş seç (salt okuma)
            </h2>
            <ul className="space-y-2">
              {orders.map((order) => {
                const active = order.id === selectedId;
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => void handleSelectOrder(order.id)}
                      className={cn(
                        'w-full rounded-card border px-3 py-3 text-left touch-feedback',
                        active
                          ? 'border-brand-navy bg-brand-navy/5'
                          : 'border-brand-gray-200 bg-white',
                      )}
                    >
                      <p className="text-sm font-semibold text-brand-navy">
                        {order.customerName}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-gray-500">
                        {order.localOrderNumber ?? order.orderNumber ?? order.id.slice(0, 8)}
                        {' · '}
                        {formatDate(order.orderDate)}
                        {' · '}
                        {order.branchName ?? 'Şube yok'}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {selectedId ? (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
              Seçimi temizle
            </Button>
          </div>
        ) : null}

        {previewLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : null}

        {loadError ? (
          <Card padding="md" className="border border-red-200 bg-red-50">
            <p className="text-sm font-medium text-red-800">{loadError}</p>
          </Card>
        ) : null}

        {selectedOrder && exportResult?.status === 'matching_pending' ? (
          <Card padding="md" className="border border-amber-300 bg-amber-50">
            <h2 className="text-sm font-semibold text-amber-950">
              matching_pending — sipariş silinmedi / değiştirilmedi
            </h2>
            <ul className="mt-3 space-y-2">
              {exportResult.details.map((detail, index) => (
                <li
                  key={`${detail.reason}-${detail.lineId ?? index}`}
                  className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-950"
                >
                  <p className="font-mono text-xs text-amber-700">{detail.reason}</p>
                  <p className="mt-1">{detail.message}</p>
                  {detail.lineId ? (
                    <p className="mt-1 text-xs text-brand-gray-500">
                      lineId: {detail.lineId}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <dl className="mt-4">
              <FieldRow label="order.id" value={selectedOrder.id} />
              <FieldRow
                label="customerId"
                value={selectedOrder.customerId}
              />
              <FieldRow
                label="notes"
                value={selectedOrder.notes?.trim() || '—'}
              />
            </dl>
          </Card>
        ) : null}

        {selectedOrder && exportResult?.status === 'mapped' ? (
          <div className="space-y-4">
            <Card padding="md">
              <h2 className="mb-2 text-sm font-semibold text-brand-navy">
                ORFICHE (önizleme)
              </h2>
              <dl>
                <FieldRow label="CLIENTREF" value={exportResult.orfiche.CLIENTREF} />
                <FieldRow label="TRCODE" value={exportResult.orfiche.TRCODE} />
                <FieldRow
                  label="FICHENO"
                  value="(Logo üretecek — henüz yok)"
                />
                <FieldRow
                  label="LOGICALREF (provisional)"
                  value={exportResult.orfiche.LOGICALREF}
                />
                <FieldRow
                  label="DATE"
                  value={formatDate(exportResult.orfiche.orderDateIso)}
                />
                <FieldRow
                  label="SPECODE (şube)"
                  value={exportResult.orfiche.SPECODE || '—'}
                />
                <FieldRow
                  label="GENEXP1 (açıklama)"
                  value={exportResult.orfiche.GENEXP1 || '—'}
                />
                <FieldRow
                  label="CUSTORDNO"
                  value={exportResult.orfiche.CUSTORDNO ?? '—'}
                />
                <FieldRow
                  label="SOURCEINDEX"
                  value={exportResult.orfiche.SOURCEINDEX}
                />
              </dl>
            </Card>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-brand-navy">
                ORFLINE ({exportResult.orflines.length} satır)
              </h2>
              {exportResult.orflines.map((row) => {
                const sourceLine = lineById.get(row.beraLineId);
                const barcodeAtOrder = sourceLine?.barcodeAtOrder?.trim() || '';
                const current = row.currentBarcode.trim();
                const barcodeChanged =
                  Boolean(barcodeAtOrder) &&
                  Boolean(current) &&
                  barcodeAtOrder !== current;

                return (
                  <Card key={row.beraLineId} padding="md">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-gray-400">
                      LINENO_ {row.LINENO_} · eşleşme: {row.matchedBy}
                    </p>
                    <dl>
                      <FieldRow label="STOCKREF" value={row.STOCKREF} />
                      <FieldRow label="Product.erpId" value={row.STOCKREF} />
                      <FieldRow label="CODE (güncel)" value={current || '—'} />
                      <FieldRow
                        label="PRODUCERCODE"
                        value={row.currentSku || '—'}
                      />
                      <FieldRow label="AMOUNT" value={row.AMOUNT} />
                      <FieldRow label="PRICE" value={row.PRICE} />
                      <FieldRow label="TOTAL" value={row.TOTAL} />
                      <FieldRow label="UOMREF" value={row.UOMREF} />
                      <FieldRow label="USREF" value={row.USREF} />
                      <FieldRow label="LINETYPE" value={row.LINETYPE} />
                      <FieldRow label="SOURCEINDEX" value={row.SOURCEINDEX} />
                      <FieldRow label="TRCODE" value={row.TRCODE} />
                      <FieldRow
                        label="barcodeAtOrder"
                        value={barcodeAtOrder || '—'}
                      />
                    </dl>
                    {barcodeChanged ? (
                      <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-950">
                        Eski barkod: {barcodeAtOrder} → Güncel gönderim barkodu:{' '}
                        {current}
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-brand-gray-500">
                        Sipariş anı barkodu ile güncel CODE aynı
                        {barcodeAtOrder ? ` (${barcodeAtOrder})` : ''}.
                      </p>
                    )}
                  </Card>
                );
              })}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
