import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { ROUTES } from '@/shared/constants/routes';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function ReportingMenuPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const salesReady = Boolean(user?.reportingSalesSql?.trim() && user?.reportingStockAuthorityCode?.trim());
  return (
    <div>
      <PageHeader title="Raporlama" subtitle="Firma yetkilisi raporları" />
      <div className="page-content grid grid-cols-2 gap-3">
        <button type="button" onClick={() => { void navigate(ROUTES.REPORTING_STOCK); }} className="touch-feedback min-h-40 rounded-card border border-brand-gray-200 bg-white p-4 text-left shadow-card hover:border-brand-navy/30 hover:shadow-card-hover active:scale-[0.98]">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy/10 text-brand-navy"><svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></span>
          <p className="mt-4 text-[15px] font-bold text-brand-navy">Depo Merkez Stok</p>
          <p className="mt-1 text-xs leading-5 text-brand-gray-500">Size tanımlı stok yetki kodundaki ürünler</p>
        </button>
        <button type="button" disabled={!salesReady} onClick={() => { void navigate(ROUTES.REPORTING_SALES); }} className="touch-feedback min-h-40 rounded-card border border-brand-gray-200 bg-white p-4 text-left shadow-card enabled:hover:border-brand-navy/30 disabled:opacity-55">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gray-200 text-brand-gray-500"><svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16v-4m5 4V7m5 9v-6" /></svg></span>
          <p className="mt-4 text-[15px] font-bold text-brand-gray-600">Satış Raporu</p>
          <p className="mt-1 text-xs leading-5 text-brand-gray-500">{salesReady ? 'Tarih seçin, Excel alın veya paylaşın' : 'ADMIN rapor sorgusu ve stok grup kodu tanımlamalı'}</p>
        </button>
      </div>
    </div>
  );
}
