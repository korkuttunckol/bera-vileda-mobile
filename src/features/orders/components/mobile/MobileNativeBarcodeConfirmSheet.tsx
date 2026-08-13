import { useEffect, useId, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useVisualViewportKeyboard } from '@/shared/hooks/useVisualViewportKeyboard';
import { toast } from '@/stores/toastStore';
import {
  parseScanQuantity,
  resolveScannedProduct,
} from '@/features/orders/utils/barcodeScanOrder';
import type { Product } from '@/shared/types/product.types';

interface MobileNativeBarcodeConfirmSheetProps {
  open: boolean;
  product: Product | null;
  scannedBarcode: string;
  onClose: () => void;
  /** Existing draft addToCart — accumulates qty for same product. */
  onAddToCart: (product: Product, quantity: number) => void;
}

/**
 * After native ML Kit auto-detect: confirm qty then addToCart.
 * No continuous camera loop here — scanner already closed.
 */
export function MobileNativeBarcodeConfirmSheet({
  open,
  product,
  scannedBarcode,
  onClose,
  onAddToCart,
}: MobileNativeBarcodeConfirmSheetProps) {
  const titleId = useId();
  const qtyInputRef = useRef<HTMLInputElement | null>(null);
  const [qtyText, setQtyText] = useState('1');
  const [isAdding, setIsAdding] = useState(false);
  const { keyboardOpen, keyboardInset } = useVisualViewportKeyboard();
  // iOS WKWebView: fixed bottom sheet stays under the soft keyboard unless lifted.
  // Android adjustResize already shrinks the WebView — do not add a second offset.
  const iosKeyboardLiftPx =
    Capacitor.getPlatform() === 'ios' && keyboardOpen
      ? Math.max(0, Math.round(keyboardInset))
      : 0;

  useEffect(() => {
    if (!open || !product) return;
    setQtyText('1');

    // Wait for sheet mount / layout after native camera → WebView, then autofocus.
    // iOS: temporary readOnly so focus does not open the keyboard (preventScroll alone
    // is not enough). Unlock on user touch so the numeric keyboard opens normally.
    // Android: unchanged focus + select (no readOnly).
    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    const unlockCleanups: Array<() => void> = [];

    const timeoutId = window.setTimeout(() => {
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          if (cancelled) return;
          const input = qtyInputRef.current;
          if (!input) return;

          const isIos = Capacitor.getPlatform() === 'ios';
          if (isIos) {
            input.readOnly = true;
            input.focus({ preventScroll: true });
            input.select();

            const unlock = (): void => {
              input.readOnly = false;
            };
            input.addEventListener('touchstart', unlock, {
              once: true,
              passive: true,
              capture: true,
            });
            input.addEventListener('mousedown', unlock, {
              once: true,
              capture: true,
            });
            unlockCleanups.push(() => {
              input.removeEventListener('touchstart', unlock, true);
              input.removeEventListener('mousedown', unlock, true);
              input.readOnly = false;
            });
            return;
          }

          input.focus();
          input.select();
        });
      });
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (raf1 !== 0) window.cancelAnimationFrame(raf1);
      if (raf2 !== 0) window.cancelAnimationFrame(raf2);
      for (const cleanup of unlockCleanups) cleanup();
    };
  }, [open, product]);

  if (!open || !product) return null;

  const handleConfirm = (): void => {
    if (isAdding) return;
    const qty = parseScanQuantity(qtyText);
    if (qty == null) {
      toast('Geçerli bir miktar girin.', 'warning');
      return;
    }

    const resolved = resolveScannedProduct(product);
    if (resolved.status === 'out_of_stock') {
      toast('Bu ürünün stoğu bulunmuyor.', 'warning');
      onClose();
      return;
    }

    setIsAdding(true);
    try {
      onAddToCart(product, qty);
      toast(`${product.name} sepete eklendi (${String(qty)})`, 'success');
      onClose();
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={
        iosKeyboardLiftPx > 0
          ? { paddingBottom: iosKeyboardLiftPx }
          : undefined
      }
    >
      <button
        type="button"
        className="min-h-0 flex-1 cursor-default"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        className={
          iosKeyboardLiftPx > 0
            ? 'rounded-t-2xl bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]'
            : 'safe-area-bottom rounded-t-2xl bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]'
        }
      >
        <p id={titleId} className="text-xs text-brand-gray-500">
          {scannedBarcode}
        </p>
        <p className="mt-1 truncate text-base font-semibold text-brand-navy">
          {product.name}
        </p>
        <p className="mt-0.5 text-sm text-brand-gray-500">
          {product.sku}
          <span className="text-brand-gray-400"> · </span>
          Stok: {product.stockQuantity}
        </p>

        <div className="mt-3">
          <Input
            ref={qtyInputRef}
            label="Sipariş miktarı"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={qtyText}
            onChange={(e) => {
              setQtyText(e.target.value.replace(/[^\d]/g, ''));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isAdding}
          >
            İptal
          </Button>
          <Button type="button" onClick={handleConfirm} isLoading={isAdding}>
            Ürünü Ekle
          </Button>
        </div>
      </div>
    </div>
  );
}
