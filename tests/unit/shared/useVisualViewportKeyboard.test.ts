import { describe, expect, it } from 'vitest';
import { computeKeyboardState } from '@/shared/hooks/useVisualViewportKeyboard';

describe('computeKeyboardState', () => {
  it('reports closed when viewport nearly matches window height', () => {
    expect(computeKeyboardState(800, 780, 0)).toEqual({
      keyboardOpen: false,
      keyboardInset: 20,
    });
  });

  it('reports open when keyboard shrinks viewport past threshold', () => {
    expect(computeKeyboardState(800, 420, 0)).toEqual({
      keyboardOpen: true,
      keyboardInset: 380,
    });
  });

  it('accounts for visualViewport.offsetTop (iOS)', () => {
    expect(computeKeyboardState(800, 500, 80)).toEqual({
      keyboardOpen: true,
      keyboardInset: 220,
    });
  });
});
