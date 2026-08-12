import { useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/shared/components/ui/Button';
import { scanNativeBarcodeForPoc } from '@/features/nativeBarcodePoc/scanNativeBarcodeForPoc';

/**
 * Isolated Capacitor + ML Kit Android barcode POC.
 * No Product lookup / cart / order / sync wiring.
 */
export function NativeBarcodePocPage() {
  const [rawBarcode, setRawBarcode] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  const handleScan = useCallback(async (): Promise<void> => {
    setIsScanning(true);
    setStatusMessage('Kamera hazırlanıyor...');
    try {
      const result = await scanNativeBarcodeForPoc({
        onStatus: (message) => {
          setStatusMessage(message);
        },
      });
      if (result.status === 'success') {
        setRawBarcode(result.rawValue);
        setFormat(result.format);
        setStatusMessage(null);
        return;
      }
      if (result.status === 'cancelled') {
        setStatusMessage('Tarama iptal edildi.');
        return;
      }
      setStatusMessage(result.message);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Beklenmeyen hata.',
      );
    } finally {
      setIsScanning(false);
    }
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 bg-brand-surface px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-gray-500">
          Capacitor · ML Kit · Android POC
        </p>
        <h1 className="text-2xl font-bold text-brand-navy">Barkod Testi</h1>
        <p className="text-sm text-brand-gray-500">
          Native kamera ile gerçek barkodu okutup yalnızca string gösterir.
          Sipariş / ürün lookup yok.
        </p>
      </header>

      <div className="rounded-2xl border border-brand-gray-200 bg-white p-4 text-sm text-brand-gray-600">
        <p>
          Platform: <span className="font-semibold text-brand-navy">{platform}</span>
        </p>
        <p>
          Native:{' '}
          <span className="font-semibold text-brand-navy">
            {isNative ? 'evet' : 'hayır (tarayıcı)'}
          </span>
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        fullWidth
        isLoading={isScanning}
        disabled={isScanning}
        onClick={() => {
          void handleScan();
        }}
      >
        BARKODU TARA
      </Button>

      <section className="rounded-2xl border border-brand-gray-200 bg-white p-4 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-gray-500">
          Okunan Barkod
        </p>
        <div className="mt-3 rounded-xl border border-dashed border-brand-gray-300 bg-brand-gray-50 px-3 py-6 text-center">
          {rawBarcode ? (
            <p className="break-all font-mono text-xl font-semibold tracking-wide text-brand-navy">
              {rawBarcode}
            </p>
          ) : (
            <p className="text-sm text-brand-gray-400">Henüz okuma yok</p>
          )}
        </div>
        {format ? (
          <p className="mt-2 text-xs text-brand-gray-500">Format: {format}</p>
        ) : null}
      </section>

      {statusMessage ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {statusMessage}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        fullWidth
        disabled={isScanning}
        onClick={() => {
          void handleScan();
        }}
      >
        Tekrar Tara
      </Button>
    </div>
  );
}
