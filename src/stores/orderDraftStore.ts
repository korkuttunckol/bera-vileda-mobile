import { create } from 'zustand';
import type { OrderDraft, OrderFlowStep } from '@/features/orders/types/orderFlow.types';
import {
  buildDraftLine,
  recalculateLine,
} from '@/features/orders/utils/orderCalculations';
import type { Product } from '@/shared/types/product.types';

interface OrderDraftState extends OrderDraft {
  setStep: (step: OrderFlowStep) => void;
  selectCustomer: (id: string, name: string, code: string) => void;
  selectBranch: (id: string, name: string) => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateLineQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
}

const INITIAL: OrderDraft = {
  step: 'customer',
  lines: [],
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
