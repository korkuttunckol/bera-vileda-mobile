import { Card } from '@/shared/components/ui/Card';
import { ProductInfoDisplay } from '@/features/products/components/ProductInfoDisplay';
import type { Product } from '@/shared/types/product.types';

interface DepotStockCardProps {
  product: Product;
}

export function DepotStockCard({ product }: DepotStockCardProps) {
  return (
    <Card padding="md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-gray-500">
        Merkez depo stok kartı
      </p>
      <ProductInfoDisplay product={product} variant="depot" />
      {product.packSize ? (
        <p className="mt-2 text-xs text-brand-gray-500">Koli içi: {product.packSize}</p>
      ) : null}
    </Card>
  );
}
