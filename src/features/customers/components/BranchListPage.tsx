import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { BackButton } from '@/shared/components/layout/BackButton';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { ConfirmDialog } from '@/shared/components/ui/Modal';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useCustomer } from '../hooks/useCustomer';
import { useBranches } from '../hooks/useBranches';
import { branchService } from '../services/branchService';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { ROUTES } from '@/shared/constants/routes';

export function BranchListPage() {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { customer, isLoading: customerLoading } = useCustomer(customerId);
  const { branches, isLoading, reload } = useBranches(customerId);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (): Promise<void> => {
    if (!user || !deleteId) return;
    setIsDeleting(true);
    try {
      await branchService.softDelete(deleteId, user.uid);
      toast('Şube silindi', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Silme başarısız', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (customerLoading) {
    return <LoadingSpinner fullPage label="Yükleniyor..." />;
  }

  return (
    <div>
      <PageHeader
        title="Şubeler"
        subtitle={customer?.name ?? ''}
        backButton={
          customerId ? (
            <BackButton
              to={ROUTES.CUSTOMER_EDIT.replace(':id', customerId)}
              label="Müşteri"
            />
          ) : (
            <BackButton to={ROUTES.CUSTOMERS} />
          )
        }
        action={
          customerId ? (
            <Button
              size="sm"
              onClick={() =>
                void navigate(
                  ROUTES.CUSTOMER_BRANCH_NEW.replace(':id', customerId),
                )
              }
            >
              + Ekle
            </Button>
          ) : undefined
        }
      />

      <div className="p-4">
        {isLoading ? (
          <LoadingSpinner label="Şubeler yükleniyor..." />
        ) : branches.length === 0 ? (
          <EmptyState
            title="Henüz şube yok"
            description="Bu müşteriye şube ekleyin."
            action={
              customerId ? (
                <Button
                  onClick={() =>
                    void navigate(
                      ROUTES.CUSTOMER_BRANCH_NEW.replace(':id', customerId),
                    )
                  }
                >
                  + Şube Ekle
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {branches.map((branch) => (
              <Card
                key={branch.id}
                padding="none"
                className="cursor-pointer active:bg-brand-gray-50"
                onClick={() =>
                  void navigate(
                    ROUTES.CUSTOMER_BRANCH_EDIT.replace(':id', customerId ?? '')
                      .replace(':branchId', branch.id),
                  )
                }
              >
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-brand-navy">
                        {branch.name}
                      </p>
                      <Badge
                        label={branch.isActive ? 'Aktif' : 'Pasif'}
                        variant={branch.isActive ? 'active' : 'passive'}
                      />
                    </div>
                    {branch.address ? (
                      <p className="truncate text-sm text-brand-gray-500">
                        {branch.address}
                      </p>
                    ) : null}
                    {branch.phone ? (
                      <p className="text-sm text-brand-gray-400">
                        {branch.phone}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(branch.id);
                    }}
                    className="ml-2 shrink-0 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Sil
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => { setDeleteId(null); }}
        onConfirm={() => void handleDelete()}
        title="Şubeyi Sil"
        message="Bu şube silinecek. Kayıt tamamen kaldırılmaz, pasif hale getirilir. Devam etmek istiyor musunuz?"
        confirmLabel="Sil"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
