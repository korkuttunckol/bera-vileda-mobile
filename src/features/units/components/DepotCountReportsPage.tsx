import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { ConfirmDialog, Modal } from '@/shared/components/ui/Modal';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { toast } from '@/stores/toastStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import type { DepotCountReport, DepotCountReportLine } from '../types/depotCountReport.types';
import {
  deleteDepotCountReport,
  exportSavedDepotCountReport,
  listDepotCountReports,
  updateDepotCountReportLine,
  type DepotCountReportKind,
} from '../services/depotCountReportService';
import { DepotMenuButton } from './DepotMenuButton';

function warehouseLabel(report: DepotCountReport): string {
  return report.warehouse === 'central' ? 'Merkez Depo' : 'İade Deposu';
}

export function DepotCountReportsPage() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [reports, setReports] = useState<DepotCountReport[]>([]);
  const [selected, setSelected] = useState<DepotCountReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState<DepotCountReportKind | null>(null);
  const [lineToEdit, setLineToEdit] = useState<DepotCountReportLine | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DepotCountReport | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setReports(await listDepotCountReports());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const exportReport = (kind: DepotCountReportKind): void => {
    if (!selected) return;
    void (async () => {
      setExporting(kind);
      try {
        await exportSavedDepotCountReport(selected, kind);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Rapor oluşturulamadı.', 'error');
      } finally {
        setExporting(null);
      }
    })();
  };

  const openLineEdit = (line: DepotCountReportLine): void => {
    setLineToEdit(line);
    setEditValue(String(line.countQuantity));
  };

  const saveLine = (): void => {
    if (!selected || !lineToEdit || !user) return;
    const quantity = Number(editValue);
    if (!Number.isInteger(quantity) || quantity < 0) {
      toast('Sayım miktarı 0 veya daha büyük tam sayı olmalı.', 'warning');
      return;
    }
    void (async () => {
      setIsSaving(true);
      try {
        const updated = await updateDepotCountReportLine(selected.id, lineToEdit.productId, quantity, user);
        setSelected(updated);
        setReports((current) => current.map((report) => report.id === updated.id ? updated : report));
        setLineToEdit(null);
        toast('Sayım satırı düzeltildi.', 'success');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Rapor düzeltilemedi.', 'error');
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const removeReport = (): void => {
    if (!deleteTarget || !user) return;
    void (async () => {
      try {
        await deleteDepotCountReport(deleteTarget.id, user);
        setReports((current) => current.filter((report) => report.id !== deleteTarget.id));
        setSelected(null);
        setDeleteTarget(null);
        toast('Sayım raporu silindi.', 'success');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Rapor silinemedi.', 'error');
      }
    })();
  };

  if (selected) {
    return (
      <div>
        <PageHeader title="Sayım Raporu" subtitle={`${warehouseLabel(selected)} · ${selected.groupCode}`} action={<DepotMenuButton />} />
        <div className="page-content space-y-4">
          <Card padding="sm" className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-brand-navy">{new Date(selected.createdAt).toLocaleString('tr-TR')}</p><p className="text-xs text-brand-gray-500">Sayan: {selected.createdByName}</p></div>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setSelected(null); }}>Listeye Dön</Button>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" isLoading={exporting === 'excel'} onClick={() => { exportReport('excel'); }}>Excel Çıkar</Button>
            <Button type="button" variant="outline" isLoading={exporting === 'pdf'} onClick={() => { exportReport('pdf'); }}>PDF Çıkar</Button>
          </div>
          {isAdmin ? <Button type="button" variant="danger" fullWidth onClick={() => { setDeleteTarget(selected); }}>Raporu Sil</Button> : null}
          <div className="list-stack">
            {selected.lines.map((line) => {
              const difference = line.countQuantity - line.stockQuantity;
              return (
                <Card key={line.productId} padding="md">
                  <p className="text-sm font-bold text-brand-navy">{line.name}</p>
                  <p className="mt-1 text-xs text-brand-gray-500">Kod: {line.sku} · Barkod: {line.barcode}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-brand-gray-100 pt-2 text-sm">
                    <span>Stok: <strong>{line.stockQuantity}</strong> · Sayım: <strong>{line.countQuantity}</strong></span>
                    <span className={difference === 0 ? 'font-bold text-emerald-700' : 'font-bold text-red-700'}>Fark: {difference}</span>
                  </div>
                  {isAdmin ? <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => { openLineEdit(line); }}>Düzelt</Button> : null}
                </Card>
              );
            })}
          </div>
        </div>
        <Modal isOpen={lineToEdit !== null} onClose={() => { setLineToEdit(null); }} title="Sayım Miktarını Düzelt">
          <div className="space-y-4"><p className="text-sm text-brand-gray-600">{lineToEdit?.name}</p><label className="block text-sm font-semibold text-brand-gray-700">Yeni sayım miktarı<input autoFocus inputMode="numeric" type="number" min="0" value={editValue} onChange={(event) => { setEditValue(event.target.value); }} className="mt-1.5 h-11 w-full rounded-xl border border-brand-gray-200 px-3 text-base outline-none focus:border-brand-navy" /></label><Button type="button" fullWidth isLoading={isSaving} onClick={saveLine}>Kaydet</Button></div>
        </Modal>
        <ConfirmDialog isOpen={deleteTarget !== null} title="Sayım raporu silinsin mi?" message="Rapor listeden kaldırılacak. Bu işlem yalnızca yönetici tarafından yapılabilir." confirmLabel="Sil" variant="danger" onConfirm={removeReport} onClose={() => { setDeleteTarget(null); }} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Sayım Raporları" subtitle="Tamamlanan depo sayımları" action={<DepotMenuButton />} />
      <div className="page-content">
        {isLoading ? <LoadingSpinner label="Raporlar yükleniyor..." /> : reports.length === 0 ? <EmptyState title="Henüz sayım raporu yok" description="Tamamlanan sayımlar burada saklanır." /> : <div className="list-stack">{reports.map((report) => <button key={report.id} type="button" className="w-full text-left" onClick={() => { setSelected(report); }}><Card padding="md" className="touch-feedback"><p className="font-bold text-brand-navy">{warehouseLabel(report)} · {report.groupCode}</p><p className="mt-1 text-sm text-brand-gray-600">{new Date(report.createdAt).toLocaleString('tr-TR')}</p><p className="mt-1 text-xs text-brand-gray-500">{report.lines.length} ürün · Sayan: {report.createdByName}</p></Card></button>)}</div>}
      </div>
    </div>
  );
}
