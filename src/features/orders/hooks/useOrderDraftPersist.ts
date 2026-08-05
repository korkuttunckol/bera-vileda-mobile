import { useEffect, useRef } from 'react';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import type { PersistedOrderDraft } from './orderPrefs';

const DRAFT_STORAGE_KEY = 'bera:order-draft-v1';

function readDraft(): PersistedOrderDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedOrderDraft>;
    return {
      step: parsed.step ?? 'customer',
      customerId: parsed.customerId,
      customerName: parsed.customerName,
      customerCode: parsed.customerCode,
      branchId: parsed.branchId,
      branchName: parsed.branchName,
      lines: parsed.lines ?? [],
      notes: parsed.notes,
    };
  } catch {
    return null;
  }
}

function writeDraft(draft: PersistedOrderDraft): void {
  try {
    const isEmpty = !draft.customerId && draft.lines.length === 0;
    if (isEmpty) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearPersistedOrderDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Persist draft via store getState/setState — does not modify orderDraftStore.ts.
 * Enables refresh recovery for in-progress orders.
 */
export function useOrderDraftPersist(): void {
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const saved = readDraft();
    if (!saved) return;

    useOrderDraftStore.setState({
      step: saved.step,
      customerId: saved.customerId,
      customerName: saved.customerName,
      customerCode: saved.customerCode,
      branchId: saved.branchId,
      branchName: saved.branchName,
      lines: saved.lines,
      notes: saved.notes,
    });
  }, []);

  useEffect(() => {
    const unsubscribe = useOrderDraftStore.subscribe((state) => {
      writeDraft({
        step: state.step,
        customerId: state.customerId,
        customerName: state.customerName,
        customerCode: state.customerCode,
        branchId: state.branchId,
        branchName: state.branchName,
        lines: state.lines,
        notes: state.notes,
      });
    });
    return unsubscribe;
  }, []);
}
