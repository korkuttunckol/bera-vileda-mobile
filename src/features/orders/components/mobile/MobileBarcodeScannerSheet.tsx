import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { productService } from '@/features/products/services/productService';
import { toast } from '@/stores/toastStore';
import {
  parseScanQuantity,
  resolveScannedProduct,
  shouldAcceptScanEvent,
  SCAN_COOLDOWN_MS,
} from '@/features/orders/utils/barcodeScanOrder';
import {
  createBarcodeScanEngine,
  MANUAL_SCAN_MISS_TOAST,
  MANUAL_SCAN_NOT_READY_TOAST,
} from '@/features/orders/utils/barcodeScannerEngine';
import type { BarcodeScanEngine } from '@/features/orders/utils/barcodeScannerEngine';
import type { Product } from '@/shared/types/product.types';

interface MobileBarcodeScannerSheetProps {
  open: boolean;
  onClose: () => void;
  /** Uses existing draft addToCart (accumulates qty for same product). */
  onAddToCart: (product: Product, quantity: number) => void;
}

type SheetPhase = 'booting' | 'scanning' | 'confirm' | 'error';

export function MobileBarcodeScannerSheet({
  open,
  onClose,
  onAddToCart,
}: MobileBarcodeScannerSheetProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<BarcodeScanEngine | null>(null);
  const lastScanRef = useRef<{ barcode: string | null; at: number }>({
    barcode: null,
    at: 0,
  });
  const qtyInputRef = useRef<HTMLInputElement | null>(null);
  const phaseRef = useRef<SheetPhase>('booting');
  const resolvingRef = useRef(false);
  const titleId = useId();

  const [phase, setPhase] = useState<SheetPhase>('booting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [qtyText, setQtyText] = useState('1');
  const [isAdding, setIsAdding] = useState(false);
  const [isManualScanning, setIsManualScanning] = useState(false);

  const setPhaseSafe = useCallback((next: SheetPhase): void => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopEngine = useCallback((): void => {
    engineRef.current?.stop();
    engineRef.current = null;
  }, []);

  const resumeScanning = useCallback((): void => {
    resolvingRef.current = false;
    setPendingProduct(null);
    setScannedBarcode('');
    setQtyText('1');
    setIsManualScanning(false);
    setPhaseSafe('scanning');
    engineRef.current?.resume();
  }, [setPhaseSafe]);

  const handleDetected = useCallback(
    async (rawBarcode: string): Promise<void> => {
      if (phaseRef.current !== 'scanning' || resolvingRef.current) return;

      const barcode = rawBarcode.trim();
      const now = Date.now();
      if (
        !shouldAcceptScanEvent({
          barcode,
          now,
          lastBarcode: lastScanRef.current.barcode,
          lastAcceptedAt: lastScanRef.current.at,
          cooldownMs: SCAN_COOLDOWN_MS,
        })
      ) {
        return;
      }

      resolvingRef.current = true;
      lastScanRef.current = { barcode, at: now };
      engineRef.current?.pause();

      try {
        const product = await productService.findByBarcode(barcode);
        const resolved = resolveScannedProduct(product);

        if (resolved.status === 'not_found') {
          toast('Bu barkoda ait ürün bulunamadı.', 'warning');
          resumeScanning();
          return;
        }

        if (resolved.status === 'out_of_stock') {
          toast('Bu ürünün stoğu bulunmuyor.', 'warning');
          resumeScanning();
          return;
        }

        setScannedBarcode(barcode);
        setPendingProduct(resolved.product);
        setQtyText('1');
        setPhaseSafe('confirm');
      } catch {
        toast('Barkod işlenirken hata oluştu.', 'error');
        resumeScanning();
      }
    },
    [resumeScanning, setPhaseSafe],
  );

  const handleDetectedRef = useRef(handleDetected);
  handleDetectedRef.current = handleDetected;

  useEffect(() => {
    if (!open) {
      stopEngine();
      setPhaseSafe('booting');
      setErrorMessage(null);
      setPendingProduct(null);
      setScannedBarcode('');
      setQtyText('1');
      setIsManualScanning(false);
      lastScanRef.current = { barcode: null, at: 0 };
      return;
    }

    const cancelledRef = { current: false };

    const start = async (): Promise<void> => {
      setPhaseSafe('booting');
      setErrorMessage(null);
      try {
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => {
            resolve();
          });
        });
        if (cancelledRef.current) return;
        const video = videoRef.current;
        if (!video) {
          throw new Error('Kamera önizlemesi hazır değil.');
        }

        const engine = await createBarcodeScanEngine({
          video,
          facingMode: 'environment',
          onDetect: (code) => {
            void handleDetectedRef.current(code);
          },
        });
        // Effect cleanup may flip this while awaiting camera init.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated by cleanup
        if (cancelledRef.current) {
          engine.stop();
          return;
        }
        engineRef.current = engine;
        await engine.start();
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated by cleanup
        if (cancelledRef.current) {
          engine.stop();
          return;
        }
        // Preview is live — continuous decode may still be warming up.
        setPhaseSafe('scanning');
      } catch (error) {
        if (cancelledRef.current) return;
        stopEngine();
        const message =
          error instanceof Error ? error.message : 'Kamera açılamadı.';
        setErrorMessage(message);
        setPhaseSafe('error');
        toast(message, 'error');
      }
    };

    void start();

    return () => {
      cancelledRef.current = true;
      stopEngine();
    };
  }, [open, stopEngine, setPhaseSafe]);

  useEffect(() => {
    if (phase !== 'confirm') return;
    const id = window.setTimeout(() => {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    }, 50);
    return () => {
      window.clearTimeout(id);
    };
  }, [phase, pendingProduct?.id]);

  const handleCancelConfirm = (): void => {
    resumeScanning();
  };

  const handleManualScan = useCallback(async (): Promise<void> => {
    if (phaseRef.current !== 'scanning' || isManualScanning || resolvingRef.current) {
      return;
    }
    const engine = engineRef.current;
    if (!engine?.isPreviewLive()) {
      toast(MANUAL_SCAN_NOT_READY_TOAST, 'warning');
      return;
    }

    setIsManualScanning(true);
    try {
      const result = await engine.scanOnce();
      if (result.status === 'detected') {
        await handleDetected(result.barcode);
        return;
      }
      if (result.status === 'not_ready') {
        toast(MANUAL_SCAN_NOT_READY_TOAST, 'warning');
        return;
      }
      toast(MANUAL_SCAN_MISS_TOAST, 'warning');
    } catch {
      toast(MANUAL_SCAN_MISS_TOAST, 'warning');
    } finally {
      setIsManualScanning(false);
    }
  }, [handleDetected, isManualScanning]);

  const handleConfirmAdd = (): void => {
    if (!pendingProduct || isAdding) return;
    const qty = parseScanQuantity(qtyText);
    if (qty == null) {
      toast('Geçerli bir miktar girin.', 'warning');
      return;
    }

    const resolved = resolveScannedProduct(pendingProduct);
    if (resolved.status === 'out_of_stock') {
      toast('Bu ürünün stoğu bulunmuyor.', 'warning');
      resumeScanning();
      return;
    }

    setIsAdding(true);
    try {
      onAddToCart(pendingProduct, qty);
      toast(`${pendingProduct.name} sepete eklendi (${String(qty)})`, 'success');
      resumeScanning();
    } finally {
      setIsAdding(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="safe-area-top flex items-center justify-between gap-3 px-4 py-3 text-white">
        <div>
          <p id={titleId} className="text-base font-semibold">
            Barkod okut
          </p>
          <p className="text-xs text-white/70">
            {phase === 'confirm'
              ? 'Miktarı girip ürünü ekleyin'
              : 'Barkodu çerçeveye hizalayıp tarayın'}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-white/30 bg-white/10 text-white hover:bg-white/20"
          onClick={onClose}
        >
          Kapat
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {phase !== 'confirm' ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 pb-28">
            <div className="h-44 w-full max-w-sm rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        ) : null}

        {phase === 'booting' && !pendingProduct ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-sm text-white">Kamera açılıyor...</p>
          </div>
        ) : null}

        {phase === 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6">
            <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-center shadow-lg">
              <p className="text-sm font-medium text-brand-navy">
                {errorMessage ?? 'Kamera kullanılamıyor.'}
              </p>
              <Button type="button" className="mt-4 w-full" onClick={onClose}>
                Kapat
              </Button>
            </div>
          </div>
        ) : null}

        {phase === 'scanning' ? (
          <div className="safe-area-bottom absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pb-4 pt-10">
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              className="text-base tracking-wide"
              onClick={() => {
                void handleManualScan();
              }}
              isLoading={isManualScanning}
              disabled={isManualScanning}
            >
              BARKODU TARA
            </Button>
          </div>
        ) : null}

        {phase === 'confirm' && pendingProduct ? (
          <div className="safe-area-bottom absolute inset-x-0 bottom-0 bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
            <p className="text-xs text-brand-gray-500">{scannedBarcode}</p>
            <p className="mt-1 truncate text-base font-semibold text-brand-navy">
              {pendingProduct.name}
            </p>
            <p className="mt-0.5 text-sm text-brand-gray-500">
              {pendingProduct.sku}
              <span className="text-brand-gray-400"> · </span>
              Stok:{pendingProduct.stockQuantity}
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
                    handleConfirmAdd();
                  }
                }}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelConfirm}
                disabled={isAdding}
              >
                İptal
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAdd}
                isLoading={isAdding}
              >
                Ürünü Ekle
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
