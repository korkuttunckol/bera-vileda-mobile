import { useSyncExternalStore } from 'react';

export interface VisualViewportKeyboardState {
  /** True when the soft keyboard is likely open. */
  keyboardOpen: boolean;
  /** Approximate keyboard height in CSS pixels. */
  keyboardInset: number;
  /** Visible layout height used for diagnostics. */
  viewportHeight: number;
}

const KEYBOARD_OPEN_THRESHOLD_PX = 120;

let state: VisualViewportKeyboardState = {
  keyboardOpen: false,
  keyboardInset: 0,
  viewportHeight:
    typeof window !== 'undefined' ? window.innerHeight : 0,
};

/** Largest known height while no editable is focused (adjustResize baseline). */
let baselineHeight =
  typeof window !== 'undefined' ? window.innerHeight : 0;

const listeners = new Set<() => void>();
let attached = false;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function hasFocusedEditable(): boolean {
  if (typeof document === 'undefined') return false;
  return isEditableTarget(document.activeElement);
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
  const layoutHeight = window.innerHeight;
  const visualHeight = vv?.height ?? layoutHeight;
  const offsetTop = vv?.offsetTop ?? 0;

  // With adjustResize, innerHeight already shrinks — compare to baseline.
  // With adjustPan / iOS, visualViewport inset is the better signal.
  const resizeInset = Math.max(0, baselineHeight - layoutHeight);
  const visualInset = Math.max(0, layoutHeight - visualHeight - offsetTop);
  const inset = Math.max(resizeInset, visualInset);
  const focused = hasFocusedEditable();

  // Prefer focus+shrink; also treat large visual inset alone (iOS Safari).
  const keyboardOpen =
    (focused && inset > KEYBOARD_OPEN_THRESHOLD_PX) ||
    inset > KEYBOARD_OPEN_THRESHOLD_PX * 1.5;

  return {
    keyboardOpen,
    keyboardInset: inset,
    viewportHeight: Math.min(layoutHeight, visualHeight),
  };
}

function applyDomFlags(next: VisualViewportKeyboardState): void {
  if (typeof document === 'undefined') return;
  // Only toggle class — do NOT rewrite shell height every frame (causes jumps).
  document.documentElement.classList.toggle('keyboard-open', next.keyboardOpen);
}

function syncViewport(): void {
  if (typeof window !== 'undefined' && !hasFocusedEditable()) {
    baselineHeight = Math.max(baselineHeight, window.innerHeight);
  }

  const next = readViewport();
  const changed =
    next.keyboardOpen !== state.keyboardOpen ||
    next.keyboardInset !== state.keyboardInset ||
    next.viewportHeight !== state.viewportHeight;

  if (!changed) return;
  state = next;
  applyDomFlags(next);
  emit();
}

function onFocusIn(event: FocusEvent): void {
  if (isEditableTarget(event.target)) {
    syncViewport();
  }
}

function onFocusOut(): void {
  // Defer: next focus may land on another input in the same tick.
  window.setTimeout(() => {
    if (!hasFocusedEditable() && typeof window !== 'undefined') {
      baselineHeight = Math.max(baselineHeight, window.innerHeight);
    }
    syncViewport();
  }, 0);
}

function ensureAttached(): void {
  if (attached || typeof window === 'undefined') return;
  attached = true;

  baselineHeight = window.innerHeight;
  const vv = window.visualViewport;
  vv?.addEventListener('resize', syncViewport);
  vv?.addEventListener('scroll', syncViewport);
  window.addEventListener('resize', syncViewport);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
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
 * Soft-keyboard state for Android WebView (adjustResize) + iOS/PWA.
 * Does not mutate layout height continuously — consumers hide chrome only.
 */
export function useVisualViewportKeyboard(): VisualViewportKeyboardState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Pure helper for unit tests. */
export function computeKeyboardState(
  baselineHeightPx: number,
  layoutHeight: number,
  visualHeight: number,
  offsetTop = 0,
  focusedEditable = true,
  thresholdPx = KEYBOARD_OPEN_THRESHOLD_PX,
): Pick<VisualViewportKeyboardState, 'keyboardOpen' | 'keyboardInset'> {
  const resizeInset = Math.max(0, baselineHeightPx - layoutHeight);
  const visualInset = Math.max(0, layoutHeight - visualHeight - offsetTop);
  const inset = Math.max(resizeInset, visualInset);
  const keyboardOpen =
    (focusedEditable && inset > thresholdPx) || inset > thresholdPx * 1.5;
  return {
    keyboardOpen,
    keyboardInset: inset,
  };
}
