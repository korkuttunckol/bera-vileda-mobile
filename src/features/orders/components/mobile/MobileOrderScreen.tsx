import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { branchService } from '@/features/customers/services/branchService';
import { orderService } from '@/features/orders/services/orderService';
import {
  useOrderDraftPersist,
  clearPersistedOrderDraft,
} from '@/features/orders/hooks/useOrderDraftPersist';
import {
  rememberLastBranch,
  rememberRecentCustomer,
  rememberRecentProduct,
  getLastBranchForCustomer,
} from '@/features/orders/hooks/orderPrefs';
import { productService } from '@/features/products/services/productService';
import {
  barcodeLookupCandidates,
  scanNativeBarcode,
} from '@/shared/nativeBarcode/scanNativeBarcode';
import { resolveScannedProduct } from '@/features/orders/utils/barcodeScanOrder';
import {
  isValidOrderBranchSelection,
  ORDER_CENTER_BRANCH,
} from '@/features/orders/utils/orderBranchOptions';
import { useVisualViewportKeyboard } from '@/shared/hooks/useVisualViewportKeyboard';
import { shouldKeepCustomerPickerMounted } from '@/features/orders/utils/orderSearchVisibility';
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/utils/cn';
import type { Customer } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';
import { MobileCustomerSection } from './MobileCustomerSection';
import { MobileProductSection } from './MobileProductSection';
import { MobileNativeBarcodeConfirmSheet } from './MobileNativeBarcodeConfirmSheet';
import { MobileStickyCartBar } from './MobileStickyCartBar';
import { MobileQtyStepper } from './MobileQtyStepper';

/**
 * Single-screen mobile order UI.
 * Wizard steps still advance via orderDraftStore actions under the hood.
 */
export function MobileOrderScreen() {
  useOrderDraftPersist();

  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { keyboardOpen } = useVisualViewportKeyboard();

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
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  /** True while Müşteri seç picker UI is open (including initial empty draft). */
  const [customerPickerOpen, setCustomerPickerOpen] = useState(!customerId);

  const cartQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of lines) {
      map[line.productId] = line.quantity;
    }
    return map;
  }, [lines]);

  const resolveBranch = async (customer: Customer): Promise<void> => {
    try {
      const rows = await branchService.listByCustomer(customer.id);
      const active = rows
        .filter((b) => b.isActive && !b.isDeleted)
        .map((b) => ({ id: b.id, name: b.name }));

      const remembered = getLastBranchForCustomer(customer.id);
      if (
        remembered &&
        isValidOrderBranchSelection(remembered.branchId, active)
      ) {
        selectBranch(remembered.branchId, remembered.branchName);
        return;
      }

      if (active.length === 0) {
        selectBranch(ORDER_CENTER_BRANCH.id, ORDER_CENTER_BRANCH.name);
        rememberLastBranch(customer.id, {
          branchId: ORDER_CENTER_BRANCH.id,
          branchName: ORDER_CENTER_BRANCH.name,
        });
        return;
      }

      if (active.length === 1) {
        selectBranch(active[0].id, active[0].name);
        rememberLastBranch(customer.id, {
          branchId: active[0].id,
          branchName: active[0].name,
        });
      }
      // Multiple registered branches: leave unset so the user picks from the list
      // (do not inject synthetic Merkez alongside DEPO/MERKEZ).
    } catch {
      selectBranch(ORDER_CENTER_BRANCH.id, ORDER_CENTER_BRANCH.name);
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

  const handleSelectBranch = (nextBranchId: string, nextBranchName: string): void => {
    selectBranch(nextBranchId, nextBranchName);
    if (customerId) {
      rememberLastBranch(customerId, {
        branchId: nextBranchId,
        branchName: nextBranchName,
      });
    }
  };

  const handleQuantityChange = useCallback(
    (product: Product, quantity: number): void => {
      const current = useOrderDraftStore
        .getState()
        .lines.find((line) => line.productId === product.id)?.quantity ?? 0;

      if (quantity < 1) {
        if (current > 0) removeLine(product.id);
        return;
      }

      if (current === 0) {
        addToCart(product, quantity);
        rememberRecentProduct(product.id);
        return;
      }

      updateLineQuantity(product.id, quantity);
    },
    [addToCart, removeLine, updateLineQuantity],
  );

  const handleScanAddToCart = useCallback(
    (product: Product, quantity: number): void => {
      addToCart(product, quantity);
      rememberRecentProduct(product.id);
    },
    [addToCart],
  );

  const handleScanBarcodeClick = useCallback((): void => {
    if (isScanningBarcode) return;

    void (async () => {
      setIsScanningBarcode(true);
      try {
        const result = await scanNativeBarcode();
        if (result.status === 'cancelled') return;
        if (result.status === 'denied' || result.status === 'unsupported') {
          toast(result.message, 'warning');
          return;
        }
        if (result.status === 'error') {
          toast(result.message, 'error');
          return;
        }

        const candidates = barcodeLookupCandidates(result.rawValue);
        let product: Product | undefined;
        for (const code of candidates) {
          product = await productService.findByBarcode(code);
          if (product) break;
        }

        const resolved = resolveScannedProduct(product);
        if (resolved.status === 'not_found') {
          toast(
            `Barkod bulunamadı: ${result.rawValue}`,
            'warning',
          );
          return;
        }
        if (resolved.status === 'out_of_stock') {
          toast('Bu ürünün stoğu bulunmuyor.', 'warning');
          return;
        }

        setScannedBarcode(result.rawValue);
        setConfirmProduct(resolved.product);
      } catch (error) {
        toast(
          error instanceof Error ? error.message : 'Barkod taranamadı.',
          'error',
        );
      } finally {
        setIsScanningBarcode(false);
      }
    })();
  }, [isScanningBarcode]);

  const handleSave = async (): Promise<void> => {
    if (!user) return;
    if (!customerId || lines.length === 0) {
      toast('Müşteri ve ürün seçimi gereklidir', 'error');
      return;
    }
    if (!branchId) {
      selectBranch(ORDER_CENTER_BRANCH.id, ORDER_CENTER_BRANCH.name);
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
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        keyboardOpen ? 'pb-2' : 'pb-44',
      )}
    >
      {/*
        Customer chrome:
        - Always keep MobileCustomerSection mounted while picking a customer
          (no customerId, or picker re-opened). POC previously rendered null
          when keyboardOpen && !customerId, which destroyed cari search.
        - Once a customer is selected and picker is closed, collapse to a one-line
          summary while the product search keyboard is open.
      */}
      {shouldKeepCustomerPickerMounted({
        keyboardOpen,
        customerId,
        customerPickerOpen,
      }) ? (
        <div className="shrink-0 space-y-3 p-3 pb-0">
          <MobileCustomerSection
            selectedCustomerId={customerId}
            selectedCustomerName={customerName}
            selectedBranchId={branchId}
            selectedBranchName={branchName}
            onSelectCustomer={handleSelectCustomer}
            onSelectBranch={handleSelectBranch}
            onChangeCustomer={() => {
              setShowCartLines(false);
            }}
            onPickerOpenChange={setCustomerPickerOpen}
          />

          {showCartLines && lines.length > 0 ? (
            <section className="space-y-3 rounded-2xl border border-brand-gray-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-navy">Sepet</p>
                <button
                  type="button"
                  className="min-h-12 px-2 text-sm text-brand-gray-500"
                  onClick={() => {
                    setShowCartLines(false);
                  }}
                >
                  Kapat
                </button>
              </div>
              <ul className="space-y-1">
                {lines.map((line) => (
                  <li
                    key={line.productId}
                    className="flex items-center gap-2 border-b border-brand-gray-100 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-navy">
                        {line.productName}
                      </p>
                      <p className="truncate text-xs text-brand-gray-500">
                        {line.productSku}
                      </p>
                    </div>
                    <MobileQtyStepper
                      value={line.quantity}
                      min={1}
                      onChange={(qty) => {
                        updateLineQuantity(line.productId, qty);
                      }}
                    />
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
                className="mt-2 min-h-12 w-full"
                onClick={handleShare}
              >
                Paylaş
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="shrink-0 px-3 pt-2">
          <p className="truncate text-xs text-brand-gray-500">
            {customerName}
            {branchName ? ` · ${branchName}` : ''}
          </p>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col px-3 pt-2">
        <MobileProductSection
          enabled={Boolean(customerId && branchId)}
          cartQtyByProductId={cartQtyByProductId}
          onQuantityChange={handleQuantityChange}
          onScanBarcodeClick={handleScanBarcodeClick}
          scanBarcodeBusy={isScanningBarcode}
        />
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

      <MobileNativeBarcodeConfirmSheet
        open={Boolean(confirmProduct)}
        product={confirmProduct}
        scannedBarcode={scannedBarcode}
        onClose={() => {
          setConfirmProduct(null);
          setScannedBarcode('');
        }}
        onAddToCart={handleScanAddToCart}
      />
    </div>
  );
}
