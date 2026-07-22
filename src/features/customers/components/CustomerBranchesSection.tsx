import { useNavigate } from 'react-router-dom';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { useBranches } from '../hooks/useBranches';
import { buildCustomerBranchNewRoute, ROUTES } from '@/shared/constants/routes';

interface CustomerBranchesSectionProps {
  customerId: string;
  returnTo?: 'order';
}

export function CustomerBranchesSection({
  customerId,
  returnTo,
}: CustomerBranchesSectionProps) {
  const navigate = useNavigate();
  const { branches, isLoading } = useBranches(customerId);

  const openAddBranch = (): void => {
    void navigate(buildCustomerBranchNewRoute(customerId, returnTo));
  };

  const openEditBranch = (branchId: string): void => {
    void navigate(
      ROUTES.CUSTOMER_BRANCH_EDIT.replace(':id', customerId).replace(
        ':branchId',
        branchId,
      ),
    );
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-brand-navy">Şubeler</p>
        <Button type="button" size="sm" variant="outline" onClick={openAddBranch}>
          + Şube Ekle
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Şubeler yükleniyor..." />
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-gray-200 bg-brand-gray-50/50 px-4 py-6 text-center">
          <p className="text-sm text-brand-gray-500">Henüz şube eklenmemiş.</p>
          <Button type="button" size="sm" className="mt-3" onClick={openAddBranch}>
            + Şube Ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => { openEditBranch(branch.id); }}
              className="flex w-full items-center justify-between rounded-xl border border-brand-gray-100 bg-white px-3 py-2.5 text-left transition-colors active:bg-brand-gray-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-brand-navy">
                    {branch.name}
                  </span>
                  <Badge
                    label={branch.isActive ? 'Aktif' : 'Pasif'}
                    variant={branch.isActive ? 'active' : 'passive'}
                  />
                </div>
                {branch.address ? (
                  <p className="truncate text-xs text-brand-gray-500">
                    {branch.address}
                  </p>
                ) : null}
              </div>
              <svg
                className="ml-2 h-4 w-4 shrink-0 text-brand-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>
      )}

      {branches.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => {
            void navigate(ROUTES.CUSTOMER_BRANCHES.replace(':id', customerId));
          }}
        >
          Tüm Şubeleri Yönet
        </Button>
      ) : null}
    </Card>
  );
}
