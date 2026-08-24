import type { AuthUser } from '@/features/auth/types/auth.types';
import { UserRole } from '@/shared/types/role.types';

export type BusinessUnit = 'sales' | 'depot' | 'packaging' | 'reporting' | 'management';

const ACTIVE_BUSINESS_UNIT_KEY = 'bera-active-business-unit-v1';

export interface BusinessUnitDefinition {
  id: BusinessUnit;
  title: string;
  description: string;
}

export const BUSINESS_UNITS: Record<BusinessUnit, BusinessUnitDefinition> = {
  sales: { id: 'sales', title: 'Satış', description: 'Sipariş, müşteri ve satış işlemleri' },
  depot: { id: 'depot', title: 'Depo', description: 'Stok sorgulama ve depo işlemleri' },
  packaging: { id: 'packaging', title: 'Paketleme', description: 'Paketleme operasyonları' },
  reporting: { id: 'reporting', title: 'Raporlama', description: 'Birim raporları ve analizler' },
  management: { id: 'management', title: 'Yönetim', description: 'Yönetim ekranları' },
};

const SALES_CODES = new Set(['2100', '2210', '2211', '2214', '2215', '2217', 'MERCH', 'MERCH1']);
const REPORTING_CODES = new Set(['VİLEDA', 'VILEDA', 'WELLNAX', 'DOA']);

/**
 * İlk geçiş dönemi için kullanıcı koduna göre birim erişimi.
 * Bir sonraki adımda ADMIN Ayarlar ekranından Firestore üzerinde yönetilecek.
 */
export function allowedBusinessUnits(user: AuthUser | null): BusinessUnit[] {
  if (!user) return [];
  if (user.role === UserRole.ADMIN) return ['sales', 'depot', 'packaging', 'reporting', 'management'];

  if (user.role === UserRole.DEPOT) return ['depot'];
  if (user.role === UserRole.PACKAGING) return ['packaging'];
  if (user.role === UserRole.REPORTING) return ['reporting'];
  if (user.role === UserRole.MANAGEMENT) return ['management'];

  const code = user.userCode.trim().toUpperCase();
  if (code === 'DEPO') return ['depot'];
  if (code === 'PAKETLEME') return ['packaging'];
  if (REPORTING_CODES.has(code)) return ['reporting'];
  if (SALES_CODES.has(code) || user.role === UserRole.SALES_REP || user.role === UserRole.MERCH) return ['sales'];
  return [];
}

/**
 * Son kullanılan birim cihazda tutulur. Oturum geri yüklendiğinde Android'in
 * varsayılan satış ekranına dönmesini engeller; kayıt her zaman kullanıcının
 * güncel yetkileriyle yeniden doğrulanır.
 */
export function setActiveBusinessUnit(unit: BusinessUnit): void {
  localStorage.setItem(ACTIVE_BUSINESS_UNIT_KEY, unit);
}

export function resolveActiveBusinessUnit(user: AuthUser | null): BusinessUnit | null {
  const allowed = allowedBusinessUnits(user);
  if (allowed.length === 0) return null;

  const stored = localStorage.getItem(ACTIVE_BUSINESS_UNIT_KEY);
  if (stored && allowed.includes(stored as BusinessUnit)) {
    return stored as BusinessUnit;
  }

  // Tek birime yetkili kullanıcılar için (özellikle DEPO) seçim kesin olur.
  if (allowed.length === 1) return allowed[0];
  return allowed.includes('sales') ? 'sales' : allowed[0];
}
