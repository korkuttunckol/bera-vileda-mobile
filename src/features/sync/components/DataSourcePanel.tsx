import { DATA_SOURCE_LABELS } from '@/shared/lib/sync/dataSource.types';
import type { DataSourceSnapshot } from '@/shared/lib/sync/dataSource.types';

interface DataSourcePanelProps {
  sources: DataSourceSnapshot | null;
  compact?: boolean;
}

export function DataSourcePanel({ sources, compact = false }: DataSourcePanelProps) {
  if (!sources) {
    return (
      <p className="text-sm text-brand-gray-500">
        Veri kaynağı bilgisi yükleniyor...
      </p>
    );
  }

  const items = [
    { label: 'Okuma katmanı', value: 'IndexedDB' },
    { label: 'Cari kaynağı', value: DATA_SOURCE_LABELS[sources.customers] },
    { label: 'Stok kaynağı', value: DATA_SOURCE_LABELS[sources.products] },
    { label: 'Kullanıcı kaynağı', value: DATA_SOURCE_LABELS[sources.users] },
    { label: 'Oturum kaynağı', value: DATA_SOURCE_LABELS[sources.auth] },
  ];

  return (
    <div className={compact ? 'space-y-1 text-xs' : 'space-y-1.5 text-sm'}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3">
          <span className="text-brand-gray-500">{item.label}</span>
          <span className="font-medium text-brand-navy">{item.value}</span>
        </div>
      ))}
      <p className={compact ? 'pt-1 text-[11px] text-brand-gray-400' : 'pt-1 text-xs text-brand-gray-400'}>
        Online senkronizasyon sonrası Firestore verileri IndexedDB önbelleğine yazılır; tüm ekranlar aynı yerel kaynaktan okur.
      </p>
    </div>
  );
}
