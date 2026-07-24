import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/utils/cn';
import type { BulkOrderSelectionStats } from '../hooks/useBulkOrderSelection';
import type { BulkOrderSendKind } from '../services/bulkOrderSendService';

interface BulkSendPanelProps {
  stats: BulkOrderSelectionStats;
  hasSelection: boolean;
  isProcessing: boolean;
  onSend: (kind: BulkOrderSendKind) => Promise<void>;
}

interface BulkSendOption {
  kind: BulkOrderSendKind;
  label: string;
  disabled?: boolean;
  hint?: string;
}

const SEND_OPTIONS: BulkSendOption[] = [
  { kind: 'pdf', label: 'PDF Oluştur' },
  { kind: 'excel', label: 'Excel Oluştur' },
  { kind: 'whatsapp', label: 'WhatsApp ile Paylaş' },
];

const STAT_ROWS: Array<{
  label: string;
  getValue: (stats: BulkOrderSelectionStats) => number;
}> = [
  { label: 'Seçilen Sipariş', getValue: (stats) => stats.selectedOrderCount },
  { label: 'Seçilen Müşteri', getValue: (stats) => stats.selectedCustomerCount },
  { label: 'Toplam Kalem', getValue: (stats) => stats.totalLines },
  { label: 'Toplam Adet', getValue: (stats) => stats.totalQuantity },
];

export function BulkSendPanel({
  stats,
  hasSelection,
  isProcessing,
  onSend,
}: BulkSendPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!hasSelection) {
      setIsExpanded(false);
    }
  }, [hasSelection]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 px-4 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-2xl border border-brand-gray-200 bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.12)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="space-y-0.5 text-sm leading-snug">
              {STAT_ROWS.map((row) => (
                <p key={row.label} className="whitespace-nowrap text-brand-gray-700">
                  <span className="font-medium text-brand-navy">{row.label} :</span>{' '}
                  {String(row.getValue(stats))}
                </p>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {isExpanded ? (
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-medium text-brand-gray-500 hover:bg-brand-gray-100 hover:text-brand-navy"
                onClick={() => { setIsExpanded(false); }}
                aria-label="Paneli kapat"
              >
                Kapat
              </button>
            ) : null}
            <Button
              size="lg"
              className="whitespace-nowrap px-5"
              disabled={!hasSelection || isProcessing}
              isLoading={isProcessing && !isExpanded}
              onClick={() => {
                if (!hasSelection) return;
                setIsExpanded((value) => !value);
              }}
            >
              📤 TOPLU GÖNDER
            </Button>
          </div>
        </div>

        {isExpanded ? (
          <div className="space-y-2 border-t border-brand-gray-100 px-4 py-3">
            {SEND_OPTIONS.map((option) => (
              <Button
                key={option.kind}
                fullWidth
                variant="outline"
                isLoading={isProcessing}
                disabled={isProcessing}
                onClick={() => void onSend(option.kind)}
              >
                {option.label}
              </Button>
            ))}
            <button
              type="button"
              disabled
              className={cn(
                'flex w-full items-center justify-between rounded-xl border border-brand-gray-200',
                'bg-brand-gray-50 px-4 py-3 text-left text-sm text-brand-gray-400',
              )}
            >
              <span>Logo GO Wings</span>
              <span className="text-xs">İleride</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
