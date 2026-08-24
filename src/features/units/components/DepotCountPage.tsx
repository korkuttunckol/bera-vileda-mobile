import { useMemo, useState } from 'react';
import { ConfirmDialog, Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { SearchInput } from '@/shared/components/form/SearchInput';
import { GroupCodeFilter } from '@/features/products/components/GroupCodeFilter';
import { useProducts } from '@/features/products/hooks/useProducts';
import {
  barcodeLookupCandidates,
  scanNativeBarcode,
} from '@/shared/nativeBarcode/scanNativeBarcode';
import { toast } from '@/stores/toastStore';
import type { Product } from '@/shared/types/product.types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { exportDepotCountReport, type DepotCountReportKind } from '../services/depotCountReportService';

type CountPhase = 'setup' | 'counting' | 'review' | 'complete';
type Warehouse = 'central' | 'returns';
type CountEntryMode = 'set' | 'add';

function matchesSearch(product: Product, value: string): boolean {
  const query = value.trim().toLocaleLowerCase('tr-TR');
  if (!query) return true;
  return [product.barcode ?? '', product.sku, product.name]
    .some((field) => field.toLocaleLowerCase('tr-TR').includes(query));
}

export function DepotCountPage() {
  const { user } = useAuth();
  const { products, groupCodes, isLoading } = useProducts('', 'active');
  const [phase, setPhase] = useState<CountPhase>('setup');
  const [warehouse, setWarehouse] = useState<Warehouse>('central');
  const [groupCode, setGroupCode] = useState('');
  const [countProducts, setCountProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<Partial<Record<string, number>>>({});
  const [search, setSearch] = useState('');
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [countValue, setCountValue] = useState('');
  const [countEntryMode, setCountEntryMode] = useState<CountEntryMode>('set');
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [exporting, setExporting] = useState<DepotCountReportKind | null>(null);

  const uncounted = useMemo(
    () => countProducts.filter((product) => counts[product.id] === undefined),
    [countProducts, counts],
  );
  const filteredProducts = useMemo(
    () => countProducts.filter((product) => matchesSearch(product, search)),
    [countProducts, search],
  );

  const startCount = (): void => {
    if (!groupCode) {
      toast('Sayım başlamadan önce grup kodu seçin.', 'warning');
      return;
    }
    if (warehouse === 'returns') {
      toast('İade deposu stok miktarı henüz Logo verisinden gelmiyor. Yanlış fark oluşmaması için sayım başlatılmadı.', 'warning');
      return;
    }

    const selected = products.filter((product) => product.groupCode?.trim() === groupCode);
    if (selected.length === 0) {
      toast('Bu grup kodunda sayılacak stok kartı bulunamadı.', 'warning');
      return;
    }
    setCountProducts(selected);
    setCounts({});
    setSearch('');
    setPhase('counting');
  };

  const requestCount = (product: Product): void => {
    if (!countProducts.some((item) => item.id === product.id)) {
      toast('Bu ürün seçilen grup kodunda değil.', 'warning');
      return;
    }
    if (counts[product.id] !== undefined) {
      setDuplicateProduct(product);
      return;
    }
    setPendingProduct(product);
    setCountValue('');
    setCountEntryMode('set');
  };

  const saveCount = (): void => {
    if (!pendingProduct) return;
    const quantity = Number(countValue);
    if (!Number.isInteger(quantity) || quantity < 0) {
      toast('Sayım miktarı 0 veya daha büyük tam sayı olmalı.', 'warning');
      return;
    }
    setCounts((current) => ({
      ...current,
      [pendingProduct.id]: countEntryMode === 'add'
        ? (current[pendingProduct.id] ?? 0) + quantity
        : quantity,
    }));
    setPendingProduct(null);
    setSearch('');
  };

  const lookup = (rawValue: string): void => {
    const value = rawValue.trim();
    if (!value) return;
    const candidates = barcodeLookupCandidates(value);
    const exact = countProducts.find((product) =>
      candidates.includes(product.barcode?.trim() ?? '')
      || product.sku.trim().toLocaleUpperCase('tr-TR') === value.toLocaleUpperCase('tr-TR'),
    );
    const product = exact ?? countProducts.find((item) => matchesSearch(item, value));
    if (!product) {
      toast('Ürün seçilen grupta bulunamadı.', 'warning');
      return;
    }
    requestCount(product);
  };

  const scanBarcode = (): void => {
    if (isScanning) return;
    void (async () => {
      setIsScanning(true);
      try {
        const result = await scanNativeBarcode({ cancelLabel: 'Kapat' });
        if (result.status === 'success') lookup(result.rawValue);
        else if (result.status !== 'cancelled') toast(result.message, 'warning');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Barkod taranamadı.', 'error');
      } finally {
        setIsScanning(false);
      }
    })();
  };

  const finishCount = (): void => {
    if (uncounted.length > 0) {
      setPhase('review');
      return;
    }
    setPhase('complete');
  };

  const closeRemainingWithZero = (): void => {
    setCounts((current) => {
      const next = { ...current };
      uncounted.forEach((product) => { next[product.id] = 0; });
      return next;
    });
    setPhase('complete');
  };

  const exportReport = (kind: DepotCountReportKind): void => {
    void (async () => {
      setExporting(kind);
      try {
        await exportDepotCountReport({
          warehouse,
          groupCode,
          products: countProducts,
          counts,
          createdByName: user?.displayName ?? user?.userCode ?? 'Bilinmiyor',
        }, kind);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Sayım raporu oluşturulamadı.', 'error');
      } finally {
        setExporting(null);
      }
    })();
  };

  if (isLoading) {
    return <LoadingSpinner fullPage label="Stok kartları hazırlanıyor..." />;
  }

  if (phase === 'setup') {
    return (
      <div>
        <PageHeader title="Depo Sayımı" subtitle="Önce depo ve grup kodunu seçin" />
        <div className="page-content space-y-5">
          <Card padding="md" className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-brand-gray-700">Sayım yapılacak depo</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button type="button" variant={warehouse === 'central' ? 'primary' : 'outline'} onClick={() => { setWarehouse('central'); }}>
                  Merkez Depo
                </Button>
                <Button type="button" variant={warehouse === 'returns' ? 'primary' : 'outline'} onClick={() => { setWarehouse('returns'); }}>
                  İade Deposu
                </Button>
              </div>
              {warehouse === 'returns' ? (
                <p className="mt-3 text-xs leading-5 text-amber-700">İade deposu için Logo stok alanı eklendiğinde sayım aktif olacak.</p>
              ) : null}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-brand-gray-700">Grup kodu</p>
              <GroupCodeFilter value={groupCode} options={groupCodes} onChange={setGroupCode} />
              {!groupCode ? <p className="mt-2 text-xs text-brand-gray-500">Sayım, tek grup kodu üzerinden başlatılır.</p> : null}
            </div>
          </Card>
          <Button type="button" fullWidth size="lg" onClick={startCount}>Sayımı Başlat</Button>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div>
        <PageHeader title="Sayım Tamamlandı" subtitle={`${groupCode} · ${String(countProducts.length)} stok kartı`} />
        <div className="page-content space-y-4">
          <Card padding="md">
            <p className="text-lg font-bold text-brand-navy">Sayım kapatıldı</p>
            <p className="mt-2 text-sm text-brand-gray-600">Sayılmayan kartlar 0 olarak kapatıldı. Rapor; barkod, stok kodu/açıklaması, depo stok, sayım miktarı ve farkı içerir.</p>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" isLoading={exporting === 'excel'} onClick={() => { exportReport('excel'); }}>Excel Çıkar</Button>
            <Button type="button" variant="outline" isLoading={exporting === 'pdf'} onClick={() => { exportReport('pdf'); }}>PDF Çıkar</Button>
          </div>
          <Button type="button" fullWidth onClick={() => { setPhase('setup'); }}>Yeni Sayım Başlat</Button>
        </div>
      </div>
    );
  }

  const isReview = phase === 'review';
  const displayed = isReview ? uncounted : filteredProducts;
  return (
    <div>
      <PageHeader
        title={isReview ? 'Sayılmayan Ürünler' : 'Depo Sayımı'}
        subtitle={isReview
          ? `${String(uncounted.length)} ürün kontrol bekliyor`
          : `${groupCode} · ${String(Object.keys(counts).length)}/${String(countProducts.length)} sayıldı`}
      />
      <div className="page-content space-y-4">
        {!isReview ? (
          <div className="flex gap-2">
            <div className="min-w-0 flex-1"><SearchInput placeholder="Barkod, ürün kodu veya ad..." value={search} onChange={(event) => { setSearch(event.target.value); }} onClear={() => { setSearch(''); }} /></div>
            <Button type="button" variant="secondary" isLoading={isScanning} onClick={scanBarcode}>Tara</Button>
          </div>
        ) : (
          <Card padding="sm"><p className="text-sm text-brand-gray-600">Ürünleri sayıp miktar girin. Kontrol tamam ise kalanları 0 ile kapatabilirsiniz.</p></Card>
        )}

        {displayed.length === 0 ? <EmptyState title={isReview ? 'Sayılmayan ürün kalmadı' : 'Sonuç bulunamadı'} /> : (
          <div className="list-stack">
            {displayed.map((product) => {
              const value = counts[product.id];
              return (
                <button key={product.id} type="button" onClick={() => { requestCount(product); }} className="w-full text-left">
                  <Card padding="md" className="touch-feedback">
                    <p className="text-sm font-bold text-brand-navy">{product.name}</p>
                    <p className="mt-1 text-xs text-brand-gray-500">Kod: {product.sku || '-'} · Barkod: {product.barcode || '-'}</p>
                    <div className="mt-3 flex justify-between border-t border-brand-gray-100 pt-2 text-sm">
                      <span className="text-brand-gray-600">Depo stok: <strong>{product.stockQuantity}</strong></span>
                      <span className={value === undefined ? 'text-amber-700' : 'font-bold text-emerald-700'}>{value === undefined ? 'Sayılmadı' : `Sayım: ${String(value)}`}</span>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
        <Button
          type="button"
          fullWidth
          size="lg"
          onClick={isReview && uncounted.length > 0 ? closeRemainingWithZero : finishCount}
        >
          {isReview && uncounted.length > 0 ? 'Sayılmayanları 0 ile Kapat' : 'Sayımı Bitir'}
        </Button>
      </div>

      <Modal isOpen={pendingProduct !== null} onClose={() => { setPendingProduct(null); }} title={countEntryMode === 'add' ? 'Sayım Miktarı İlave Et' : 'Sayım Miktarı'}>
        {pendingProduct ? (
          <div className="space-y-4">
            <div><p className="font-semibold text-brand-navy">{pendingProduct.name}</p><p className="mt-1 text-sm text-brand-gray-500">Depo stok: {pendingProduct.stockQuantity} · Barkod: {pendingProduct.barcode || '-'}</p></div>
            <label className="block text-sm font-semibold text-brand-gray-700">{countEntryMode === 'add' ? 'İlave edilecek miktar' : 'Sayılan miktar'}<input autoFocus inputMode="numeric" type="number" min="0" value={countValue} onChange={(event) => { setCountValue(event.target.value); }} placeholder="Miktarı girin" className="mt-1.5 h-11 w-full rounded-xl border border-brand-gray-200 px-3 text-base outline-none focus:border-brand-navy" /></label>
            <Button type="button" fullWidth onClick={saveCount}>{countEntryMode === 'add' ? 'İlave Et' : 'Sayımı Kaydet'}</Button>
          </div>
        ) : null}
      </Modal>
      <ConfirmDialog
        isOpen={duplicateProduct !== null}
        title="Ürün daha önce sayıldı"
        message={duplicateProduct ? `${duplicateProduct.name} için mevcut sayım ${String(counts[duplicateProduct.id] ?? 0)}. Aynı ürünü yeniden okuttunuz. Sayıma 1 adet ilave edilsin mi?` : ''}
        confirmLabel="İlave Et"
        cancelLabel="İptal, Okumaya Devam Et"
        onConfirm={() => {
          if (duplicateProduct) {
            setPendingProduct(duplicateProduct);
            setCountValue('');
            setCountEntryMode('add');
          }
          setDuplicateProduct(null);
        }}
        onClose={() => { setDuplicateProduct(null); }}
      />
    </div>
  );
}
