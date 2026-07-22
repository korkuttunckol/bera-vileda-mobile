import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { useBranches } from '@/features/customers/hooks/useBranches';
import { buildCustomerBranchNewRoute, ROUTES } from '@/shared/constants/routes';

export function BranchSelectStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const customerId = useOrderDraftStore((s) => s.customerId);
  const customerName = useOrderDraftStore((s) => s.customerName);
  const selectBranch = useOrderDraftStore((s) => s.selectBranch);
  const setStep = useOrderDraftStore((s) => s.setStep);
  const { branches, isLoading, reload } = useBranches(customerId);

  const activeBranches = branches.filter((b) => b.isActive && !b.isDeleted);

  useEffect(() => {
    if (location.pathname === ROUTES.NEW_ORDER) {
      void reload();
    }
  }, [location.key, location.pathname, reload]);

  const openAddBranch = (): void => {
    if (!customerId) return;
    void navigate(buildCustomerBranchNewRoute(customerId, 'order'));
  };

  return (
    <div className="space-y-3 p-4">
      <Card padding="sm">
        <p className="text-xs text-brand-gray-500">Seçili Müşteri</p>
        <p className="font-medium text-brand-navy">{customerName}</p>
      </Card>

      {isLoading ? (
        <LoadingSpinner label="Şubeler yükleniyor..." />
      ) : activeBranches.length === 0 ? (
        <EmptyState
          title="Aktif şube yok"
          description="Yeni şube ekleyin veya merkez şube olarak devam edin."
          action={
            <Button fullWidth onClick={() => { selectBranch('main', 'Merkez'); }}>
              Merkez Olarak Devam Et
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {activeBranches.map((branch) => (
            <Card
              key={branch.id}
              padding="none"
              className="cursor-pointer active:bg-brand-gray-50"
              onClick={() => { selectBranch(branch.id, branch.name); }}
            >
              <div className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-brand-navy">{branch.name}</p>
                    <Badge label="Aktif" variant="active" />
                  </div>
                  {branch.address ? (
                    <p className="text-sm text-brand-gray-500">{branch.address}</p>
                  ) : null}
                </div>
                <svg
                  className="h-5 w-5 text-brand-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button fullWidth variant="outline" onClick={openAddBranch}>
        ➕ Yeni Şube Ekle
      </Button>

      <Button variant="ghost" fullWidth onClick={() => { setStep('customer'); }}>
        ← Müşteri Değiştir
      </Button>
    </div>
  );
}
