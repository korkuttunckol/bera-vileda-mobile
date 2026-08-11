/**
 * Yeni Sipariş şube seçenekleri.
 *
 * - Müşterinin aktif kayıtlı şubesi varsa: yalnızca onlar.
 * - Yoksa: sistem varsayılanı "Merkez" (id: main).
 *
 * Synthetic Merkez asla müşteri şubeleriyle birlikte listelenmez.
 */
export const ORDER_CENTER_BRANCH = { id: 'main', name: 'Merkez' } as const;

export interface OrderBranchOption {
  id: string;
  name: string;
}

export function buildOrderBranchPickerOptions(
  customerBranches: ReadonlyArray<OrderBranchOption>,
): OrderBranchOption[] {
  if (customerBranches.length === 0) {
    return [{ id: ORDER_CENTER_BRANCH.id, name: ORDER_CENTER_BRANCH.name }];
  }
  return customerBranches.map((b) => ({ id: b.id, name: b.name }));
}

/** Whether a remembered/default branch id is valid for this customer. */
export function isValidOrderBranchSelection(
  branchId: string | undefined,
  customerBranches: ReadonlyArray<OrderBranchOption>,
): boolean {
  if (!branchId) return false;
  if (customerBranches.length === 0) {
    return branchId === ORDER_CENTER_BRANCH.id;
  }
  return customerBranches.some((b) => b.id === branchId);
}
