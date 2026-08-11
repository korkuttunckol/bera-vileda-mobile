import type { ReactNode } from 'react';
import type { BarcodeManualScanDebugSnapshot } from '@/features/orders/utils/barcodeScannerDebug';

interface MobileBarcodeScanDebugPanelProps {
  snapshot: BarcodeManualScanDebugSnapshot;
}

function Row({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex gap-2 border-b border-white/10 py-0.5">
      <span className="w-28 shrink-0 text-white/60">{label}</span>
      <span className="min-w-0 break-all text-white">{value}</span>
    </div>
  );
}

export function MobileBarcodeScanDebugPanel({
  snapshot,
}: MobileBarcodeScanDebugPanelProps): ReactNode {
  const decodeLabel =
    snapshot.decode.status === 'other'
      ? `other:${snapshot.decode.otherName ?? 'unknown'}`
      : snapshot.decode.status;

  return (
    <div className="pointer-events-auto absolute inset-x-2 top-2 z-[90] max-h-[55%] overflow-y-auto rounded-lg bg-black/85 p-2 font-mono text-[10px] leading-snug text-white shadow-lg ring-1 ring-amber-400/50">
      <p className="mb-1 text-[11px] font-semibold text-amber-300">
        barcodeDebug · manuel tarama
      </p>
      <Row label="engine" value={snapshot.engine} />
      <Row label="scannedAt" value={snapshot.scannedAt} />
      <Row label="readyState" value={String(snapshot.video.readyState)} />
      <Row label="videoWidth" value={String(snapshot.video.videoWidth)} />
      <Row label="videoHeight" value={String(snapshot.video.videoHeight)} />
      <Row
        label="track.w"
        value={snapshot.track.width == null ? 'n/a' : String(snapshot.track.width)}
      />
      <Row
        label="track.h"
        value={
          snapshot.track.height == null ? 'n/a' : String(snapshot.track.height)
        }
      />
      <Row label="facingMode" value={snapshot.track.facingMode ?? 'n/a'} />
      <Row label="canvas.w" value={String(snapshot.capture.canvasWidth)} />
      <Row label="canvas.h" value={String(snapshot.capture.canvasHeight)} />
      <Row
        label="nonZeroPx"
        value={snapshot.capture.hasNonZeroPixels ? 'true' : 'false'}
      />
      <Row label="decode" value={decodeLabel} />
      <Row label="raw" value={snapshot.rawBarcode ?? '—'} />
      <Row label="format" value={snapshot.barcodeFormat ?? '—'} />
      <Row label="normalized" value={snapshot.normalizedBarcode ?? '—'} />
      <Row label="lookup" value={snapshot.lookup} />
      {snapshot.capture.thumbnailDataUrl ? (
        <div className="mt-2">
          <p className="mb-1 text-white/60">capture thumbnail</p>
          <img
            src={snapshot.capture.thumbnailDataUrl}
            alt="Son yakalanan barkod karesi"
            className="max-h-36 w-auto rounded border border-white/20"
          />
        </div>
      ) : (
        <Row label="thumbnail" value="yok" />
      )}
    </div>
  );
}
