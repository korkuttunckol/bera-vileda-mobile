import { describe, expect, it } from 'vitest';
import {
  buildOrderBranchPickerOptions,
  isValidOrderBranchSelection,
  ORDER_CENTER_BRANCH,
} from '@/features/orders/utils/orderBranchOptions';

describe('buildOrderBranchPickerOptions', () => {
  it('shows only registered DEPO + MERKEZ (no synthetic Merkez)', () => {
    const options = buildOrderBranchPickerOptions([
      { id: 'b-depo', name: 'DEPO' },
      { id: 'b-merkez', name: 'MERKEZ' },
    ]);
    expect(options.map((o) => o.name)).toEqual(['DEPO', 'MERKEZ']);
    expect(options.some((o) => o.id === ORDER_CENTER_BRANCH.id)).toBe(false);
    expect(options.some((o) => o.name === 'Merkez')).toBe(false);
  });

  it('falls back to synthetic Merkez when customer has no branches', () => {
    expect(buildOrderBranchPickerOptions([])).toEqual([
      { id: 'main', name: 'Merkez' },
    ]);
  });

  it('allows selecting DEPO and MERKEZ by id', () => {
    const registered = [
      { id: 'b-depo', name: 'DEPO' },
      { id: 'b-merkez', name: 'MERKEZ' },
    ];
    const options = buildOrderBranchPickerOptions(registered);
    expect(options.find((o) => o.name === 'DEPO')?.id).toBe('b-depo');
    expect(options.find((o) => o.name === 'MERKEZ')?.id).toBe('b-merkez');
  });
});

describe('isValidOrderBranchSelection', () => {
  const registered = [
    { id: 'b-depo', name: 'DEPO' },
    { id: 'b-merkez', name: 'MERKEZ' },
  ];

  it('rejects synthetic Merkez when customer has registered branches', () => {
    expect(isValidOrderBranchSelection('main', registered)).toBe(false);
  });

  it('accepts registered DEPO / MERKEZ ids', () => {
    expect(isValidOrderBranchSelection('b-depo', registered)).toBe(true);
    expect(isValidOrderBranchSelection('b-merkez', registered)).toBe(true);
  });

  it('accepts Merkez only when customer has no branches', () => {
    expect(isValidOrderBranchSelection('main', [])).toBe(true);
    expect(isValidOrderBranchSelection('b-depo', [])).toBe(false);
  });
});
