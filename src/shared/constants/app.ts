import { APP_CONFIG } from '@/config/app.config';

export const APP_NAME = APP_CONFIG.name;
export const APP_SHORT_NAME = APP_CONFIG.shortName;
export const APP_VERSION = APP_CONFIG.version;

export const NAV_ITEMS = [
  { path: '/', label: 'Ana Sayfa', icon: 'home' as const },
  { path: '/orders/new', label: 'Yeni Sipariş', icon: 'plus' as const },
  { path: '/customers', label: 'Müşteriler', icon: 'users' as const },
  { path: '/products', label: 'Ürünler', icon: 'box' as const },
  { path: '/orders', label: 'Geçmiş', icon: 'history' as const },
  { path: '/settings', label: 'Ayarlar', icon: 'settings' as const },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]['icon'];
