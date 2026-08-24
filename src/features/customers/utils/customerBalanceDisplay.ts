import { formatCurrency } from '@/shared/utils/cn';

export type CustomerBalanceKind = 'debit' | 'credit' | 'zero';

export interface CustomerBalanceDisplay {
  kind: CustomerBalanceKind;
  label: string;
  amountText: string;
}

export function resolveCustomerBalanceKind(
  balance: number | undefined,
): CustomerBalanceKind {
  if (balance === undefined || balance === null || Number.isNaN(balance)) {
    return 'zero';
  }
  if (balance > 0) return 'debit';
  if (balance < 0) return 'credit';
  return 'zero';
}

export function formatCustomerBalanceDisplay(
  balance: number | undefined,
): CustomerBalanceDisplay {
  const kind = resolveCustomerBalanceKind(balance);
  if (kind === 'zero') {
    return { kind, label: '—', amountText: '—' };
  }
  if (kind === 'debit') {
    return {
      kind,
      label: 'Borç',
      amountText: formatCurrency(balance ?? 0),
    };
  }
  return {
    kind: 'credit',
    label: 'Alacak',
    amountText: formatCurrency(Math.abs(balance ?? 0)),
  };
}
