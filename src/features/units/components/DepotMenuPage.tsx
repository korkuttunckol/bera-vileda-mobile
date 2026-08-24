import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/utils/cn';

type DepotIcon = 'box' | 'clipboard' | 'history' | 'checklist';

interface DepotMenuItem {
  title: string;
  description: string;
  route: string;
  icon: DepotIcon;
}

const ITEMS: DepotMenuItem[] = [
  { title: 'Stok Sorgulama', description: 'Barkod, ürün kodu ve stok bilgisi', route: ROUTES.DEPOT_STOCK, icon: 'box' },
  { title: 'Depo Sayımı', description: 'Grup bazlı barkodlu sayım yapın', route: ROUTES.DEPOT_COUNT, icon: 'clipboard' },
  { title: 'Sayım Raporları', description: 'Kaydedilen sayımları açın ve çıktı alın', route: ROUTES.DEPOT_COUNT_REPORTS, icon: 'history' },
  { title: 'Yapacaklarım', description: 'Depo görev ve takip listesi', route: ROUTES.DEPOT_TASKS, icon: 'checklist' },
];

function Icon({ icon }: { icon: DepotIcon }) {
  const path: Record<DepotIcon, string> = {
    box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    clipboard: 'M9 5h6m-5-2h4a2 2 0 012 2v1H8V5a2 2 0 012-2zm-3 3h10a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2zm3 5h6m-6 4h6',
    history: 'M3 12a9 9 0 101.9-5.5M3 4v5h5m4-2v5l3 3',
    checklist: 'M9 11l3 3L22 4M3 5h.01M3 12h.01M3 19h.01M7 5h8M7 12h3M7 19h8',
  };
  return <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={path[icon]} /></svg>;
}

export function DepotMenuPage() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title="Depo İşlemleri" subtitle="Yapmak istediğiniz işlemi seçin" />
      <div className="page-content grid grid-cols-2 gap-3">
        {ITEMS.map((item) => (
          <button key={item.route} type="button" onClick={() => { void navigate(item.route); }} className={cn('touch-feedback min-h-40 rounded-card border border-brand-gray-200 bg-white p-4 text-left shadow-card', 'hover:border-brand-navy/30 hover:shadow-card-hover active:scale-[0.98]')}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy/10 text-brand-navy"><Icon icon={item.icon} /></span>
            <p className="mt-4 text-[15px] font-bold text-brand-navy">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-brand-gray-500">{item.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
