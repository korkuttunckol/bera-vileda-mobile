import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Card } from '@/shared/components/ui/Card';
import { Icon } from '@/shared/components/ui/Icon';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { CustomerInfoDisplay } from './CustomerInfoDisplay';
import { CustomerBalanceBadge } from './CustomerBalanceBadge';
import { useCustomer } from '../hooks/useCustomer';
import { CUSTOMER_ACTION_MENU } from '../config/customerActionMenu';
import {
  ROUTES,
  buildNewOrderRoute,
} from '@/shared/constants/routes';

export function CustomerActionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customer, isLoading } = useCustomer(id);

  if (isLoading) {
    return <LoadingSpinner fullPage label="Cari yükleniyor..." />;
  }

  if (!customer) {
    return (
      <EmptyState
        title="Cari bulunamadı"
        description="Kayıt silinmiş veya erişilemiyor olabilir."
        action={
          <BackButton to={ROUTES.CUSTOMERS} label="Müşterilere dön" />
        }
      />
    );
  }

  const handleAction = (actionId: (typeof CUSTOMER_ACTION_MENU)[number]['id']): void => {
    switch (actionId) {
      case 'new-order':
        void navigate(buildNewOrderRoute(customer.id));
        break;
      case 'statement':
        void navigate(ROUTES.CUSTOMER_STATEMENT.replace(':id', customer.id));
        break;
      case 'info':
        void navigate(ROUTES.CUSTOMER_INFO.replace(':id', customer.id));
        break;
      default:
        break;
    }
  };

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={customer.code}
        backButton={<BackButton to={ROUTES.CUSTOMERS} />}
      />

      <div className="page-content space-y-4">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-base font-bold text-brand-navy">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <CustomerInfoDisplay customer={customer} />
          <CustomerBalanceBadge balance={customer.balance} />
        </Card>

        <div className="space-y-2.5">
          {CUSTOMER_ACTION_MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { handleAction(item.id); }}
              className="flex w-full min-h-[4.5rem] items-center gap-4 rounded-xl border border-brand-gray-200 bg-white px-4 py-4 text-left shadow-sm transition-colors active:bg-brand-gray-50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
                <Icon name={item.icon} size="md" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-navy">{item.label}</p>
                <p className="text-sm text-brand-gray-500">{item.description}</p>
              </div>
              <Icon name="chevron-right" className="shrink-0 text-brand-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
