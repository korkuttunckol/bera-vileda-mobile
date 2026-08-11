import { describe, expect, it } from 'vitest';
import { computeKeyboardState } from '@/shared/hooks/useVisualViewportKeyboard';

describe('computeKeyboardState', () => {
  it('detects adjustResize shrink against baseline while focused', () => {
    // WebView height already shrunk; visual ≈ layout.
    expect(computeKeyboardState(800, 420, 420, 0, true)).toEqual({
      keyboardOpen: true,
      keyboardInset: 380,
    });
  });

  it('stays closed when layout matches baseline', () => {
    expect(computeKeyboardState(800, 800, 780, 0, true)).toEqual({
      keyboardOpen: false,
      keyboardInset: 20,
    });
  });

  it('detects iOS-style visualViewport inset even without focus', () => {
    expect(computeKeyboardState(800, 800, 420, 0, false)).toEqual({
      keyboardOpen: true,
      keyboardInset: 380,
    });
  });
});
