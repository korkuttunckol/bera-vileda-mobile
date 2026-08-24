import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES } from '@/shared/constants/routes';
import { BUSINESS_UNITS, allowedBusinessUnits, type BusinessUnit } from '../unitAccess';

const UNIT_ROUTES: Record<BusinessUnit, string> = {
  sales: ROUTES.DASHBOARD,
  depot: ROUTES.DEPOT,
  packaging: ROUTES.PACKAGING,
  reporting: ROUTES.REPORTING,
  management: ROUTES.MANAGEMENT,
};

const UNIT_ICONS: Record<BusinessUnit, string> = {
  sales: '↗',
  depot: '▣',
  packaging: '□',
  reporting: '▤',
  management: '◆',
};

export function UnitHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const units = allowedBusinessUnits(user);

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-7">
      <div className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-gray-500">Bera Otomasyon</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-brand-navy">Birim seçin</h1>
        <p className="mt-2 text-sm text-brand-gray-500">
          {user?.displayName ?? user?.userCode} için yetkili işlemler
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {units.map((unit) => {
          const definition = BUSINESS_UNITS[unit];
          return (
            <button
              key={unit}
              type="button"
              onClick={() => { void navigate(UNIT_ROUTES[unit]); }}
              className="touch-feedback min-h-40 rounded-2xl border border-brand-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-navy/30 hover:shadow-md"
            >
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy text-xl font-bold text-white">
                {UNIT_ICONS[unit]}
              </span>
              <span className="block text-lg font-bold text-brand-navy">{definition.title}</span>
              <span className="mt-1 block text-xs leading-5 text-brand-gray-500">{definition.description}</span>
            </button>
          );
        })}
      </div>

      {units.length === 0 ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Bu kullanıcı için henüz birim tanımı yapılmadı. ADMIN kullanıcısı Ayarlar’dan erişimi düzenleyebilir.
        </p>
      ) : null}
    </section>
  );
}
