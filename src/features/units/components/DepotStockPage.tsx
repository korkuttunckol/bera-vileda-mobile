import { useEffect, useState } from 'react';
import { ActiveFilter, type ActiveFilterValue } from '@/shared/components/form/ActiveFilter';
import { SearchInput } from '@/shared/components/form/SearchInput';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { GroupCodeFilter } from '@/features/products/components/GroupCodeFilter';
import { useProducts } from '@/features/products/hooks/useProducts';
import { productService } from '@/features/products/services/productService';
import {
  barcodeLookupCandidates,
  scanNativeBarcode,
} from '@/shared/nativeBarcode/scanNativeBarcode';
import { toast } from '@/stores/toastStore';
import type { Product } from '@/shared/types/product.types';
import { DepotStockCard } from './DepotStockCard';

export function DepotStockPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('active');
  const [groupCode, setGroupCode] = useState('');
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const { products, groupCodes, isLoading } = useProducts(search, activeFilter, groupCode || undefined);
  const hasQuery = Boolean(search.trim() || groupCode);

  useEffect(() => {
    if (groupCode && groupCodes.length > 0 && !groupCodes.includes(groupCode)) {
      setGroupCode('');
    }
  }, [groupCode, groupCodes]);

  const handleScanBarcode = (): void => {
    if (isScanningBarcode) return;

    void (async () => {
      setIsScanningBarcode(true);
      try {
        const result = await scanNativeBarcode({ cancelLabel: 'Kapat' });
        if (result.status === 'cancelled') return;
        if (result.status !== 'success') {
          toast(result.message, result.status === 'error' ? 'error' : 'warning');
          return;
        }

        let product: Product | undefined;
        for (const candidate of barcodeLookupCandidates(result.rawValue)) {
          product = await productService.findByBarcode(candidate);
          if (product) break;
        }

        if (!product) {
          toast(`Barkod bulunamadı: ${result.rawValue}`, 'warning');
          return;
        }

        setSearch(product.barcode?.trim() || product.sku);
        setGroupCode('');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Barkod taranamadı.', 'error');
      } finally {
        setIsScanningBarcode(false);
      }
    })();
  };

  return (
    <div>
      <PageHeader title="Stok Sorgulama" subtitle="Merkez depo stoklarını görüntüleyin" />

      <div className="page-content !space-y-0 !p-0">
        <div className="sticky top-[76px] z-20 space-y-4 border-b border-brand-gray-200/80 bg-brand-surface/95 px-4 py-4 backdrop-blur-md">
          <div className="flex w-full gap-2">
            <div className="min-w-0 flex-1">
              <SearchInput
                placeholder="Barkod, ürün kodu veya ad..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                onClear={() => {
                  setSearch('');
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              isLoading={isScanningBarcode}
              onClick={handleScanBarcode}
            >
              Tara
            </Button>
          </div>
          <ActiveFilter value={activeFilter} onChange={setActiveFilter} />
          <GroupCodeFilter value={groupCode} options={groupCodes} onChange={setGroupCode} />
        </div>

        <div className="px-4 pb-6 pt-4">
          {isLoading ? (
            <LoadingSpinner fullPage label="Stoklar yükleniyor..." />
          ) : products.length === 0 ? (
            <EmptyState
              title={hasQuery ? 'Sonuç bulunamadı' : 'Henüz stok kartı yok'}
              description={hasQuery ? 'Arama veya filtrelerinizi değiştirip tekrar deneyin.' : undefined}
            />
          ) : (
            <div className="list-stack">
              <p className="section-label">{products.length} ürün · Alfabetik sıralı</p>
              {products.map((product) => (
                <DepotStockCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
