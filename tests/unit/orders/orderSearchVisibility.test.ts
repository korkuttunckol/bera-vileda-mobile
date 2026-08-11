import { describe, expect, it } from 'vitest';
import {
  shouldKeepCustomerPickerMounted,
  shouldShowTakenProductsSection,
} from '@/features/orders/utils/orderSearchVisibility';
import { filterCustomersForOrderPicker } from '@/features/orders/utils/customerPickerSearch';
import { filterProducts } from '@/shared/lib/indexeddb/repositories/productRepository';
import type { LocalCustomer } from '@/shared/lib/indexeddb/db';
import type { LocalProduct } from '@/shared/lib/indexeddb/db';

function makeCustomer(
  overrides: Partial<LocalCustomer> &
    Pick<LocalCustomer, 'id' | 'code' | 'name'>,
): LocalCustomer {
  return {
    localId: overrides.id,
    salesRepId: 'rep-1',
    source: 'excel',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedBy: 'u1',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

function makeProduct(
  overrides: Partial<LocalProduct> & Pick<LocalProduct, 'id' | 'name' | 'sku'>,
): LocalProduct {
  return {
    localId: overrides.id,
    category: 'Genel',
    unit: 'Adet',
    listPrice: 10,
    vatRate: 20,
    stockQuantity: 1,
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedBy: 'u1',
    version: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

describe('orderSearchVisibility (Android layout)', () => {
  it('keeps cari picker mounted when keyboard opens before customer select', () => {
    expect(
      shouldKeepCustomerPickerMounted({
        keyboardOpen: true,
        customerId: undefined,
        customerPickerOpen: true,
      }),
    ).toBe(true);
  });

  it('keeps cari picker mounted when user re-opens picker under keyboard', () => {
    expect(
      shouldKeepCustomerPickerMounted({
        keyboardOpen: true,
        customerId: 'c1',
        customerPickerOpen: true,
      }),
    ).toBe(true);
  });

  it('allows collapsing customer chrome only after select + picker closed', () => {
    expect(
      shouldKeepCustomerPickerMounted({
        keyboardOpen: true,
        customerId: 'c1',
        customerPickerOpen: false,
      }),
    ).toBe(false);
  });

  it('hides Alınan Siparişler while product searching (turbo stays on top)', () => {
    expect(shouldShowTakenProductsSection('')).toBe(true);
    expect(shouldShowTakenProductsSection('turbo')).toBe(false);
  });
});

describe('Android UAT search regressions (filter layer)', () => {
  it('AFM / Beşler / besler still match via order picker filter', () => {
    const customers = [
      makeCustomer({
        id: 'afm',
        code: 'C-AFM',
        name: 'AFM NAKLİYE GIDA LTD.ŞTİ.',
      }),
      makeCustomer({
        id: 'besler',
        code: 'C-BSL',
        name: 'Beşler Market Zinciri',
      }),
    ];
    expect(filterCustomersForOrderPicker(customers, 'AFM')[0]?.id).toBe('afm');
    expect(filterCustomersForOrderPicker(customers, 'Beşler')[0]?.id).toBe(
      'besler',
    );
    expect(filterCustomersForOrderPicker(customers, 'besler')[0]?.id).toBe(
      'besler',
    );
  });

  it('turbo matches and is first among filtered products', () => {
    const products = [
      makeProduct({ id: 'a', name: 'Zemin Bezi', sku: 'ZB1' }),
      makeProduct({ id: 't', name: 'Turbo Mop', sku: 'TRB' }),
      makeProduct({ id: 'b', name: 'Bez Seti', sku: 'BS1' }),
    ];
    const filtered = filterProducts(products, { search: 'turbo' });
    expect(filtered.map((p) => p.id)).toEqual(['t']);
  });
});
