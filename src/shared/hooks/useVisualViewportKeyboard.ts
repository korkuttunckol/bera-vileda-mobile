import { useSyncExternalStore } from 'react';

export interface VisualViewportKeyboardState {
  /** True when the soft keyboard is likely open (viewport shrunk). */
  keyboardOpen: boolean;
  /** Approximate keyboard height in CSS pixels. */
  keyboardInset: number;
  /** Current visualViewport height (fallback: window.innerHeight). */
  viewportHeight: number;
}

const KEYBOARD_OPEN_THRESHOLD_PX = 120;

let state: VisualViewportKeyboardState = {
  keyboardOpen: false,
  keyboardInset: 0,
  viewportHeight:
    typeof window !== 'undefined' ? window.innerHeight : 0,
};

const listeners = new Set<() => void>();
let attached = false;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function applyCssVars(next: VisualViewportKeyboardState): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--app-vv-height', `${String(next.viewportHeight)}px`);
  root.style.setProperty('--keyboard-inset', `${String(next.keyboardInset)}px`);
  root.classList.toggle('keyboard-open', next.keyboardOpen);
}

function readViewport(): VisualViewportKeyboardState {
  if (typeof window === 'undefined') {
    return {
      keyboardOpen: false,
      keyboardInset: 0,
      viewportHeight: 0,
    };
  }

  const vv = window.visualViewport;
  if (!vv) {
    return {
      keyboardOpen: false,
      keyboardInset: 0,
      viewportHeight: window.innerHeight,
    };
  }

  // offsetTop accounts for iOS URL-bar / scroll within visual viewport.
  const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  return {
    keyboardOpen: inset > KEYBOARD_OPEN_THRESHOLD_PX,
    keyboardInset: inset,
    viewportHeight: vv.height,
  };
}

function syncViewport(): void {
  const next = readViewport();
  const changed =
    next.keyboardOpen !== state.keyboardOpen ||
    next.keyboardInset !== state.keyboardInset ||
    next.viewportHeight !== state.viewportHeight;

  if (!changed) return;
  state = next;
  applyCssVars(next);
  emit();
}

function ensureAttached(): void {
  if (attached || typeof window === 'undefined') return;
  attached = true;

  const vv = window.visualViewport;
  vv?.addEventListener('resize', syncViewport);
  vv?.addEventListener('scroll', syncViewport);
  window.addEventListener('resize', syncViewport);
  syncViewport();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  ensureAttached();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): VisualViewportKeyboardState {
  return state;
}

function getServerSnapshot(): VisualViewportKeyboardState {
  return {
    keyboardOpen: false,
    keyboardInset: 0,
    viewportHeight: 0,
  };
}

/**
 * Tracks soft-keyboard via visualViewport (Android WebView / iOS / mobile browsers).
 * Also mirrors height/inset onto CSS vars `--app-vv-height` and `--keyboard-inset`.
 */
export function useVisualViewportKeyboard(): VisualViewportKeyboardState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Pure helper for unit tests. */
export function computeKeyboardState(
  innerHeight: number,
  visualHeight: number,
  offsetTop = 0,
  thresholdPx = KEYBOARD_OPEN_THRESHOLD_PX,
): Pick<VisualViewportKeyboardState, 'keyboardOpen' | 'keyboardInset'> {
  const inset = Math.max(0, innerHeight - visualHeight - offsetTop);
  return {
    keyboardOpen: inset > thresholdPx,
    keyboardInset: inset,
  };
}
