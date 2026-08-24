import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { ROUTES } from '@/shared/constants/routes';
import { BUSINESS_UNITS, type BusinessUnit } from '../unitAccess';

interface UnitPlaceholderPageProps {
  unit: Exclude<BusinessUnit, 'sales'>;
}

const UNIT_CONTENT: Record<Exclude<BusinessUnit, 'sales'>, { heading: string; description: string }> = {
  depot: {
    heading: 'Stok Sorgulama',
    description: 'Barkod, ürün adı veya ürün kodu ile ürün ve merkez depo stok bilgisini buradan görüntüleyeceğiz.',
  },
  packaging: {
    heading: 'Paketleme İşlemleri',
    description: 'Paketleme biriminin iş listesi ve takip ekranları burada yer alacak.',
  },
  reporting: {
    heading: 'Raporlama',
    description: 'Birim ve yönetim raporları burada yer alacak.',
  },
  management: {
    heading: 'Yönetim',
    description: 'Yönetim ekranları burada yer alacak.',
  },
};

export function UnitPlaceholderPage({ unit }: UnitPlaceholderPageProps) {
  const navigate = useNavigate();
  const definition = BUSINESS_UNITS[unit];
  const content = UNIT_CONTENT[unit];

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-7">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-gray-500">{definition.title} Birimi</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">{content.heading}</h1>
      <div className="mt-6 rounded-2xl border border-brand-gray-200 bg-white p-5 shadow-sm">
        <p className="text-base leading-7 text-brand-gray-600">{content.description}</p>
      </div>
      <Button className="mt-6" variant="secondary" onClick={() => { void navigate(ROUTES.UNITS); }}>
        Birimlere dön
      </Button>
    </section>
  );
}
