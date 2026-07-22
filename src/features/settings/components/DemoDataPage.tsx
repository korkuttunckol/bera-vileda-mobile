import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { SettingsBackButton } from './SettingsBackButton';
import { toast } from '@/stores/toastStore';
import { db } from '@/shared/lib/indexeddb/db';
import {
  seedDemoDataIfEmpty,
} from '@/shared/lib/indexeddb/seedDemoData';
import { seedDemoProductsIfEmpty } from '@/shared/lib/indexeddb/seedDemoProducts';

interface DataCounts {
  products: number;
  customers: number;
  branches: number;
}

export function DemoDataPage() {
  const [counts, setCounts] = useState<DataCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const loadCounts = useCallback(async () => {
    const [products, customers, branches] = await Promise.all([
      db.products.count(),
      db.customers.count(),
      db.branches.count(),
    ]);
    setCounts({ products, customers, branches });
  }, []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      try {
        await loadCounts();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadCounts]);

  const handleSeed = async (): Promise<void> => {
    setIsSeeding(true);
    try {
      const before = {
        products: await db.products.count(),
        customers: await db.customers.count(),
        branches: await db.branches.count(),
      };

      await seedDemoDataIfEmpty();
      await loadCounts();

      const after = {
        products: await db.products.count(),
        customers: await db.customers.count(),
        branches: await db.branches.count(),
      };

      const addedProducts = after.products - before.products;
      const addedCustomers = after.customers - before.customers;
      const addedBranches = after.branches - before.branches;

      if (addedProducts === 0 && addedCustomers === 0 && addedBranches === 0) {
        toast('Demo veriler zaten yüklü', 'info');
        return;
      }

      const parts: string[] = [];
      if (addedProducts > 0) parts.push(`${String(addedProducts)} ürün`);
      if (addedCustomers > 0) parts.push(`${String(addedCustomers)} müşteri`);
      if (addedBranches > 0) parts.push(`${String(addedBranches)} şube`);

      toast(`Demo veriler yüklendi: ${parts.join(', ')}`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Yükleme başarısız', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleEnsureProducts = async (): Promise<void> => {
    setIsSeeding(true);
    try {
      const before = await db.products.count();
      await seedDemoProductsIfEmpty();
      const after = await db.products.count();
      await loadCounts();
      toast(
        after > before
          ? `${String(after - before)} demo ürün eklendi`
          : 'Ürün verileri zaten mevcut',
        after > before ? 'success' : 'info',
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Yükleme başarısız', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  if (isLoading || !counts) {
    return <LoadingSpinner fullPage label="Veriler kontrol ediliyor..." />;
  }

  const hasDemoData = counts.products > 0 && counts.customers > 0;

  return (
    <div>
      <PageHeader title="Demo Verileri" backButton={<SettingsBackButton />} />

      <div className="space-y-4 p-4">
        <Card padding="md" className="space-y-3">
          <p className="text-sm text-brand-gray-600">
            Vileda ürünleri, örnek cari kartları ve şubeleri yükleyerek uygulamayı
            hemen test edebilirsiniz. Mevcut kayıtlar silinmez; yalnızca boş tablolar
            doldurulur.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-brand-gray-50 p-3">
              <p className="text-xl font-bold text-brand-navy">{counts.products}</p>
              <p className="text-xs text-brand-gray-500">Ürün</p>
            </div>
            <div className="rounded-lg bg-brand-gray-50 p-3">
              <p className="text-xl font-bold text-brand-navy">{counts.customers}</p>
              <p className="text-xs text-brand-gray-500">Müşteri</p>
            </div>
            <div className="rounded-lg bg-brand-gray-50 p-3">
              <p className="text-xl font-bold text-brand-navy">{counts.branches}</p>
              <p className="text-xs text-brand-gray-500">Şube</p>
            </div>
          </div>
        </Card>

        <Button fullWidth onClick={() => void handleSeed()} isLoading={isSeeding}>
          {hasDemoData ? 'Eksik Demo Verileri Yükle' : 'Demo Verileri Yükle'}
        </Button>

        {counts.products === 0 ? (
          <Button
            variant="outline"
            fullWidth
            onClick={() => void handleEnsureProducts()}
            isLoading={isSeeding}
          >
            Sadece Demo Ürünleri Yükle
          </Button>
        ) : null}

        {hasDemoData ? (
          <Card padding="sm" className="border-green-200 bg-green-50">
            <p className="text-xs text-green-800">
              Demo veriler hazır. Yeni Sipariş ekranından sipariş oluşturabilirsiniz.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
