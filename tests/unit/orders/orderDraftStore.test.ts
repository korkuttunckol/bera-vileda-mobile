import { beforeEach, describe, expect, it } from 'vitest';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import type { Product } from '@/shared/types/product.types';

function makeProduct(id: string, name: string): Product {
  return {
    id,
    localId: id,
    sku: `SKU-${id}`,
    name,
    category: 'Genel',
    unit: 'Adet',
    listPrice: 10,
    vatRate: 20,
    stockQuantity: 5,
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'u1',
    updatedBy: 'u1',
    version: 1,
    syncStatus: 'synced',
  };
}

describe('orderDraftStore.reset after save', () => {
  beforeEach(() => {
    useOrderDraftStore.getState().reset();
  });

  it('clears customer/branch/lines so a new order starts empty', () => {
    const store = useOrderDraftStore.getState();
    store.selectCustomer('afm', 'AFM NAKLİYE GIDA LTD.ŞTİ.', 'C-AFM');
    store.selectBranch('main', 'Merkez');
    store.addToCart(makeProduct('turbo', 'Turbo Mop'), 2);
    store.setNotes('teslimat');

    expect(useOrderDraftStore.getState().customerId).toBe('afm');
    expect(useOrderDraftStore.getState().lines).toHaveLength(1);

    // Same path as MobileOrderScreen after successful createFromDraft
    useOrderDraftStore.getState().reset();

    const after = useOrderDraftStore.getState();
    expect(after.customerId).toBeUndefined();
    expect(after.customerName).toBeUndefined();
    expect(after.customerCode).toBeUndefined();
    expect(after.branchId).toBeUndefined();
    expect(after.branchName).toBeUndefined();
    expect(after.lines).toEqual([]);
    expect(after.notes).toBeUndefined();
    expect(after.step).toBe('customer');
  });

  it('does not carry previous products into the next order', () => {
    const store = useOrderDraftStore.getState();
    store.selectCustomer('afm', 'AFM', 'C-AFM');
    store.selectBranch('main', 'Merkez');
    store.addToCart(makeProduct('p1', 'Spino'), 3);
    store.addToCart(makeProduct('p2', 'Turbo Mop'), 1);

    useOrderDraftStore.getState().reset();

    expect(useOrderDraftStore.getState().lines).toEqual([]);

    // Selecting a customer again starts a fresh cart (existing selectCustomer behavior)
    useOrderDraftStore.getState().selectCustomer('besler', 'Beşler', 'C-BSL');
    expect(useOrderDraftStore.getState().customerId).toBe('besler');
    expect(useOrderDraftStore.getState().lines).toEqual([]);
  });

  it('keeps customer selection after user picks a customer on a fresh order', () => {
    useOrderDraftStore.getState().reset();
    useOrderDraftStore
      .getState()
      .selectCustomer('afm', 'AFM NAKLİYE GIDA LTD.ŞTİ.', 'C-AFM');

    const state = useOrderDraftStore.getState();
    expect(state.customerId).toBe('afm');
    expect(state.customerName).toBe('AFM NAKLİYE GIDA LTD.ŞTİ.');
    expect(state.customerCode).toBe('C-AFM');
    expect(state.step).toBe('branch');
  });
});
