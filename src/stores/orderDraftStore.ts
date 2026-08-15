import { create } from 'zustand';
import type { OrderDraft, OrderFlowStep } from '@/features/orders/types/orderFlow.types';
import {
  buildDraftLine,
  recalculateLine,
} from '@/features/orders/utils/orderCalculations';
import { isProductOutOfStock } from '@/features/orders/utils/stockControl';
import type { Product } from '@/shared/types/product.types';

interface OrderDraftState extends OrderDraft {
  setStep: (step: OrderFlowStep) => void;
  selectCustomer: (id: string, name: string, code: string) => void;
  selectBranch: (id: string, name: string) => void;
  /**
   * Adds product to cart. Returns false when stockQuantity <= 0
   * (Logo MERKEZ / Product.stockQuantity) — product is not added.
   */
  addToCart: (product: Product, quantity?: number) => boolean;
  updateLineQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
}

const INITIAL: OrderDraft = {
  step: 'customer',
  customerId: undefined,
  customerName: undefined,
  customerCode: undefined,
  branchId: undefined,
  branchName: undefined,
  lines: [],
  notes: undefined,
};

function normalizeQuantity(quantity: number): number {
  return Math.max(1, quantity);
}

export const useOrderDraftStore = create<OrderDraftState>((set, get) => ({
  ...INITIAL,
  setStep: (step) => { set({ step }); },
  selectCustomer: (customerId, customerName, customerCode) =>
    { set({
      customerId,
      customerName,
      customerCode,
      branchId: undefined,
      branchName: undefined,
      lines: [],
      step: 'branch',
    }); },
  selectBranch: (branchId, branchName) =>
    { set({ branchId, branchName, step: 'products' }); },
  addToCart: (product, quantity = 1) => {
    // Logo MERKEZ → stockQuantity; zero stock cannot enter the order.
    if (isProductOutOfStock(product)) {
      return false;
    }

    const qty = normalizeQuantity(quantity);
    const { lines } = get();
    const existing = lines.find((l) => l.productId === product.id);

    if (existing) {
      set({
        lines: lines.map((l) =>
          l.productId === product.id
            ? recalculateLine({
                ...l,
                quantity: normalizeQuantity(existing.quantity + qty),
                stockQuantity: product.stockQuantity,
              })
            : l,
        ),
      });
    } else {
      set({ lines: [...lines, buildDraftLine(product, qty)] });
    }
    return true;
  },
  updateLineQuantity: (productId, quantity) => {
    if (quantity < 1) return;
    set({
      lines: get().lines.map((l) => {
        if (l.productId !== productId) return l;
        return recalculateLine({ ...l, quantity: normalizeQuantity(quantity) });
      }),
    });
  },
  removeLine: (productId) =>
    { set({ lines: get().lines.filter((l) => l.productId !== productId) }); },
  setNotes: (notes) => { set({ notes }); },
  reset: () => { set(INITIAL); },
}));
