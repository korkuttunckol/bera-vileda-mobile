import type { IconName } from '@/shared/components/ui/Icon';

export type CustomerActionId = 'new-order' | 'statement' | 'info';

export interface CustomerActionMenuItem {
  id: CustomerActionId;
  label: string;
  description: string;
  icon: IconName;
}

export const CUSTOMER_ACTION_MENU: CustomerActionMenuItem[] = [
  {
    id: 'new-order',
    label: 'Yeni Sipariş',
    description: 'Bu cari için sipariş girişi',
    icon: 'new-order',
  },
  {
    id: 'statement',
    label: 'Hesap Ekstresi',
    description: 'Cari hareketleri görüntüle',
    icon: 'history',
  },
  {
    id: 'info',
    label: 'Cari Kart Bilgileri',
    description: 'Kayıtlı cari bilgileri',
    icon: 'customers',
  },
];
