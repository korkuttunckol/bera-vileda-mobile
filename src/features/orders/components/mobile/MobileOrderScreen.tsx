import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { branchService } from '@/features/customers/services/branchService';
import { orderService } from '@/features/orders/services/orderService';
import { useOrderDraftPersist, clearPersistedOrderDraft } from '@/features/orders/hooks/useOrderDraftPersist';
import {
  rememberLastBranch,
  rememberRecentCustomer,
  rememberRecentProduct,
  getLastBranchForCustomer,
} from '@/features/orders/hooks/orderPrefs';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { ROUTES } from '@/shared/constants/routes';
import { formatCurrency } from '@/shared/utils/cn';
import type { Customer } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';
import { MobileCustomerSection } from './MobileCustomerSection';
import { MobileProductSection } from './MobileProductSection';
import { MobileStickyCartBar } from './MobileStickyCartBar';

const CENTER_BRANCH = { id: 'main', name: 'Merkez' } as const;

/**
 * Single-screen mobile order UI.
 * Wizard steps still advance via orderDraftStore actions under the hood.
 */
export function MobileOrderScreen() {
  useOrderDraftPersist();

  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const customerId = useOrderDraftStore((s) => s.customerId);
  const customerName = useOrderDraftStore((s) => s.customerName);
  const branchId = useOrderDraftStore((s) => s.branchId);
  const branchName = useOrderDraftStore((s) => s.branchName);
  const lines = useOrderDraftStore((s) => s.lines);
  const notes = useOrderDraftStore((s) => s.notes);

  const selectCustomer = useOrderDraftStore((s) => s.selectCustomer);
  const selectBranch = useOrderDraftStore((s) => s.selectBranch);
  const addToCart = useOrderDraftStore((s) => s.addToCart);
  const updateLineQuantity = useOrderDraftStore((s) => s.updateLineQuantity);
  const removeLine = useOrderDraftStore((s) => s.removeLine);
  const setNotes = useOrderDraftStore((s) => s.setNotes);
  const reset = useOrderDraftStore((s) => s.reset);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedOrderId, setLastSavedOrderId] = useState<string | null>(null);
  const [showCartLines, setShowCartLines] = useState(false);

  const cartQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of lines) {
      map[line.productId] = line.quantity;
    }
    return map;
  }, [lines]);

  const resolveBranch = async (customer: Customer): Promise<void> => {
    const remembered = getLastBranchForCustomer(customer.id);
    if (remembered) {
      selectBranch(remembered.branchId, remembered.branchName);
      return;
    }

    // Unlock products immediately with Merkez; refine if exactly one active branch.
    selectBranch(CENTER_BRANCH.id, CENTER_BRANCH.name);
    rememberLastBranch(customer.id, {
      branchId: CENTER_BRANCH.id,
      branchName: CENTER_BRANCH.name,
    });

    try {
      const branches = await branchService.listByCustomer(customer.id);
      const active = branches.filter((b) => b.isActive && !b.isDeleted);
      if (active.length === 1) {
        selectBranch(active[0].id, active[0].name);
        rememberLastBranch(customer.id, {
          branchId: active[0].id,
          branchName: active[0].name,
        });
      }
    } catch {
      // keep Merkez
    }
  };

  const handleSelectCustomer = (customer: Customer): void => {
    selectCustomer(customer.id, customer.name, customer.code);
    rememberRecentCustomer({
      id: customer.id,
      name: customer.name,
      code: customer.code,
    });
    void resolveBranch(customer);
    setLastSavedOrderId(null);
  };

  const handleAddProduct = (product: Product): void => {
    addToCart(product, 1);
    rememberRecentProduct(product.id);
  };

  const handleSave = async (): Promise<void> => {
    if (!user) return;
    if (!customerId || lines.length === 0) {
      toast('Müşteri ve ürün seçimi gereklidir', 'error');
      return;
    }
    if (!branchId) {
      selectBranch(CENTER_BRANCH.id, CENTER_BRANCH.name);
    }

    setIsSaving(true);
    try {
      const draft = useOrderDraftStore.getState();
      const { order, isOffline } = await orderService.createFromDraft({
        draft,
        userId: user.uid,
        userRole: user.role,
      });

      toast(
        isOffline
          ? 'Sipariş telefon hafızasına kaydedildi.'
          : 'Sipariş kaydedildi.',
        'success',
      );

      setLastSavedOrderId(order.id);
      reset();
      clearPersistedOrderDraft();
      setShowCartLines(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Kayıt başarısız', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = (): void => {
    if (!lastSavedOrderId) return;
    void navigate(ROUTES.ORDER_SEND.replace(':id', lastSavedOrderId));
  };

  return (
    <div className="pb-44">
      <div className="space-y-4 p-4">
        <MobileCustomerSection
          selectedCustomerId={customerId}
          selectedCustomerName={customerName}
          selectedBranchName={branchName}
          onSelectCustomer={handleSelectCustomer}
          onChangeCustomer={() => {
            setShowCartLines(false);
          }}
        />

        <MobileProductSection
          enabled={Boolean(customerId && branchId)}
          cartQtyByProductId={cartQtyByProductId}
          onAddProduct={handleAddProduct}
        />

        {showCartLines && lines.length > 0 ? (
          <section className="space-y-3 rounded-2xl border border-brand-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-navy">Sepet</p>
              <button
                type="button"
                className="min-h-11 px-2 text-sm text-brand-gray-500"
                onClick={() => {
                  setShowCartLines(false);
                }}
              >
                Kapat
              </button>
            </div>
            <ul className="space-y-2">
              {lines.map((line) => (
                <li
                  key={line.productId}
                  className="flex items-center gap-2 border-b border-brand-gray-100 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-navy">
                      {line.productName}
                    </p>
                    <p className="text-xs text-brand-gray-500">
                      {formatCurrency(line.lineTotal)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gray-100 text-lg font-bold text-brand-navy active:bg-brand-gray-200"
                      onClick={() => {
                        if (line.quantity <= 1) {
                          removeLine(line.productId);
                        } else {
                          updateLineQuantity(line.productId, line.quantity - 1);
                        }
                      }}
                      aria-label="Azalt"
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center text-base font-bold text-brand-navy">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gray-100 text-lg font-bold text-brand-navy active:bg-brand-gray-200"
                      onClick={() => {
                        updateLineQuantity(line.productId, line.quantity + 1);
                      }}
                      aria-label="Artır"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <Input
              label="Not (opsiyonel)"
              value={notes ?? ''}
              onChange={(e) => {
                setNotes(e.target.value);
              }}
              placeholder="Teslimat notu..."
            />
          </section>
        ) : null}

        {lastSavedOrderId ? (
          <div className="rounded-2xl border border-brand-navy/20 bg-brand-navy/5 p-3">
            <p className="text-sm text-brand-navy">
              Son sipariş kaydedildi. Yeni siparişe devam edebilir veya paylaşabilirsiniz.
            </p>
            <Button
              variant="outline"
              className="mt-2 min-h-11 w-full"
              onClick={handleShare}
            >
              Paylaş
            </Button>
          </div>
        ) : null}
      </div>

      <MobileStickyCartBar
        isSaving={isSaving}
        lastSavedOrderId={lastSavedOrderId}
        onSave={() => {
          void handleSave();
        }}
        onShare={handleShare}
        onOpenCartLines={() => {
          setShowCartLines(true);
        }}
      />
    </div>
  );
}
