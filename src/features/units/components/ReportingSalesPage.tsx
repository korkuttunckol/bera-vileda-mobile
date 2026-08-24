import { useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getStoredAuthToken } from '@/features/auth/services/localAuthStorage';
import { env, deriveLogoApiSibling } from '@/config/env';
import { shareGeneratedFiles } from '@/features/orders/report/orderReportShareService';
import { toast } from '@/stores/toastStore';
import { ReportingMenuButton } from './ReportingMenuButton';

const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 8)}01`;

export function ReportingSalesPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const run = (): void => { void (async () => {
    const token = getStoredAuthToken();
    // Firma yetkilileri hem şirket ağında hem dışarıda rapor alabilmeli.
    // Dış erişimde yalnızca Cloudflare Tunnel HTTPS adresi kullanılmalı;
    // eski LAN adresi doğrudan internete açılmıyor.
    const apiBaseUrl =
      env.VITE_LOGO_API_EXTERNAL_URL.trim() || env.VITE_LOGO_API_URL.trim();
    const url = deriveLogoApiSibling(apiBaseUrl, 'satisRaporu.ashx');
    if (!token || !url) { toast('Rapor sunucusu veya oturum bulunamadı. Çıkış yapıp tekrar giriş yapın.', 'error'); return; }
    setLoading(true);
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ startDate, endDate }) });
      const payload = await response.json() as { rows?: Record<string, unknown>[]; error?: string };
      if (!response.ok || !payload.rows) throw new Error(payload.error ?? 'Rapor alınamadı.');
      const { default: ExcelJS } = await import('exceljs'); const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Satış Raporu'); const rows = payload.rows;
      const keys = Object.keys(rows[0] ?? {}); sheet.addRow(keys); rows.forEach((row) => sheet.addRow(keys.map((key) => row[key] ?? ''))); sheet.getRow(1).font = { bold: true }; sheet.columns.forEach((column) => { column.width = 18; });
      const blob = new Blob([await book.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await shareGeneratedFiles([new File([blob], `bera-satis-raporu-${startDate}-${endDate}.xlsx`, { type: blob.type })], { whatsapp: false });
      toast(`${rows.length} satır Excel olarak hazırlandı.`, 'success');
    } catch (error) { toast(error instanceof Error ? error.message : 'Rapor alınamadı.', 'error'); } finally { setLoading(false); }
  })(); };
  return <div><PageHeader title="Satış Raporu" subtitle={`Stok grup kodu: ${user?.reportingStockAuthorityCode ?? '-'}`} action={<ReportingMenuButton />} /><div className="page-content space-y-4"><Card className="space-y-4"><label className="block text-sm font-semibold text-brand-navy">Başlangıç tarihi<input className="mt-1.5 h-11 w-full rounded-xl border border-brand-gray-200 px-3" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label className="block text-sm font-semibold text-brand-navy">Bitiş tarihi<input className="mt-1.5 h-11 w-full rounded-xl border border-brand-gray-200 px-3" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label><Button fullWidth isLoading={loading} onClick={run}>Excel Hazırla ve Paylaş</Button></Card></div></div>;
}
