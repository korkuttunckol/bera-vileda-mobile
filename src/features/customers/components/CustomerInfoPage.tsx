import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { CustomerInfoDisplay } from './CustomerInfoDisplay';
import { CustomerBalanceBadge } from './CustomerBalanceBadge';
import { useCustomer } from '../hooks/useCustomer';
import { ROUTES } from '@/shared/constants/routes';
import { formatCurrency } from '@/shared/utils/cn';

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-brand-gray-100 py-3 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wide text-brand-gray-400">
        {label}
      </span>
      <span className="text-sm text-brand-navy">{value}</span>
    </div>
  );
}

export function CustomerInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customer, isLoading } = useCustomer(id);

  if (isLoading) {
    return <LoadingSpinner fullPage label="Cari bilgileri yükleniyor..." />;
  }

  if (!customer) {
    return (
      <EmptyState
        title="Cari bulunamadı"
        description="Kayıt silinmiş veya erişilemiyor olabilir."
      />
    );
  }

  const backTo = ROUTES.CUSTOMER_ACTIONS.replace(':id', customer.id);

  return (
    <div>
      <PageHeader
        title="Cari Kart Bilgileri"
        subtitle={`${customer.code} · ${customer.name}`}
        backButton={<BackButton to={backTo} />}
      />

      <div className="page-content space-y-4">
        <Card className="flex items-center gap-3 p-4">
          <CustomerInfoDisplay customer={customer} />
          <CustomerBalanceBadge balance={customer.balance} />
        </Card>

        <Card className="divide-y divide-brand-gray-100 p-4">
          <div className="flex items-center gap-2 pb-3">
            <Badge
              label={customer.isActive ? 'Aktif' : 'Pasif'}
              variant={customer.isActive ? 'active' : 'passive'}
            />
            <Badge label={customer.source} variant="passive" />
          </div>

          <InfoRow label="Cari Kodu" value={customer.code} />
          <InfoRow label="Ünvan" value={customer.name} />
          <InfoRow label="Vergi No" value={customer.taxNumber} />
          <InfoRow label="Yetkili" value={customer.contactPerson} />
          <InfoRow label="Telefon" value={customer.phone} />
          <InfoRow label="E-posta" value={customer.email} />
          <InfoRow label="Şehir" value={customer.address?.city} />
          <InfoRow label="İlçe" value={customer.address?.district} />
          <InfoRow label="Adres" value={customer.address?.fullAddress} />
          <InfoRow label="Logo Satış Elemanı Kodu" value={customer.logoSalesRepCode} />
          <InfoRow label="Özel Kod 2" value={customer.specialCode2} />
          <InfoRow label="Logo ERP Id" value={customer.erpId} />
          {customer.balanceDebit !== undefined ? (
            <InfoRow label="Borç Toplamı" value={formatCurrency(customer.balanceDebit)} />
          ) : null}
          {customer.balanceCredit !== undefined ? (
            <InfoRow label="Alacak Toplamı" value={formatCurrency(customer.balanceCredit)} />
          ) : null}
        </Card>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            void navigate(ROUTES.CUSTOMER_EDIT.replace(':id', customer.id));
          }}
        >
          Cari Kartı Düzenle
        </Button>
      </div>
    </div>
  );
}
