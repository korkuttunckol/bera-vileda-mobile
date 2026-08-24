import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { branchService } from '@/features/customers/services/branchService';
import { customerService } from '@/features/customers/services/customerService';
import { orderService } from '@/features/orders/services/orderService';
import {
  clearPersistedOrderDraft,
} from '@/features/orders/hooks/useOrderDraftPersist';
import {
  rememberLastBranch,
  rememberRecentCustomer,
  rememberRecentProduct,
  getLastBranchForCustomer,
} from '@/features/orders/hooks/orderPrefs';
import { useOrderCommercialSummary } from '@/features/orders/hooks/useOrderTotals';
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
import { useOrderDraftStore } from '@/stores/orderDraftStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { ROUTES } from '@/shared/constants/routes';
import { fetchSalesConditionsQuote } from '@/features/orders/services/salesConditionsApiClient';
import { formatCurrency, cn } from '@/shared/utils/cn';
import type { Customer } from '@/shared/types/customer.types';
import type { Product } from '@/shared/types/product.types';
import { MobileCustomerSection } from './MobileCustomerSection';
import { MobileProductSection } from './MobileProductSection';
import { MobileNativeBarcodeConfirmSheet } from './MobileNativeBarcodeConfirmSheet';
import { MobileStickyCartBar } from './MobileStickyCartBar';
import { MobileOrderCommercialSummary } from './MobileOrderCommercialSummary';
import { MobileQtyStepper } from './MobileQtyStepper';
import { resolveShownListPrice } from './MobileProductRow';

/**
 * Single-screen mobile order UI.
 * Wizard steps still advance via orderDraftStore actions under the hood.
 */
export function MobileOrderScreen({
  presetCustomerId,
}: {
  presetCustomerId?: string;
}) {

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
  const customerCode = useOrderDraftStore((s) => s.customerCode);
  const applySalesConditions = useOrderDraftStore((s) => s.applySalesConditions);
  const commercialSummary = useOrderCommercialSummary();
  const salesConditionsReady =
    lines.length > 0 && lines.every((line) => Boolean(line.salesConditionsApplied));

  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingSalesConditions, setIsApplyingSalesConditions] =
    useState(false);
  const [lastSavedOrderId, setLastSavedOrderId] = useState<string | null>(null);
  const [showCartLines, setShowCartLines] = useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  /** True while Müşteri seç picker UI is open (including initial empty draft). */
  const [customerPickerOpen, setCustomerPickerOpen] = useState(
    !customerId && !presetCustomerId,
  );
  const presetHandledRef = useRef(false);

  const cartQtyByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of lines) {
      map[line.productId] = line.quantity;
    }
    return map;
  }, [lines]);

  const linePricingByProductId = useMemo(() => {
    const map: Record<
      string,
      { listUnitPrice: number; unitPrice: number; salesConditionsApplied: boolean }
    > = {};
    for (const line of lines) {
      map[line.productId] = {
        listUnitPrice: line.listUnitPrice ?? 0,
        unitPrice: line.unitPrice,
        salesConditionsApplied: Boolean(line.salesConditionsApplied),
      };
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

  const handleSelectCustomer = useCallback((customer: Customer): void => {
    selectCustomer(customer.id, customer.name, customer.code);
    rememberRecentCustomer({
      id: customer.id,
      name: customer.name,
      code: customer.code,
    });
    void resolveBranch(customer);
    setLastSavedOrderId(null);
  }, [selectCustomer, selectBranch]);

  useEffect(() => {
    if (!presetCustomerId || presetHandledRef.current) return;
    presetHandledRef.current = true;

    void (async () => {
      clearPersistedOrderDraft();
      reset();
      const customer = await customerService.getById(presetCustomerId);
      if (!customer) {
        toast('Seçilen cari bulunamadı.', 'error');
        setCustomerPickerOpen(true);
        return;
      }
      handleSelectCustomer(customer);
      setCustomerPickerOpen(false);
    })();
  }, [presetCustomerId, reset, handleSelectCustomer]);

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

  const handleScannedProductConfirmed = useCallback((): void => {
    // Confirm sheet first closes, then the next native camera session starts.
    // This keeps scanning until the user chooses “Siparişi Bitir” in camera.
    window.setTimeout(() => {
      handleScanBarcodeClick();
    }, 0);
  }, [handleScanBarcodeClick]);

  const handleApplySalesConditions = async (): Promise<void> => {
    const code = (customerCode ?? '').trim();
    const currentLines = useOrderDraftStore.getState().lines;
    if (!code || currentLines.length === 0) {
      toast('Cari ve ürün seçimi gereklidir', 'error');
      return;
    }

    setIsApplyingSalesConditions(true);
    try {
      const quote = await fetchSalesConditionsQuote({
        customerCode: code,
        items: currentLines.map((line) => ({
          logicalRef: line.productErpId,
          barcode: line.productBarcode,
        })),
      });
      const matchedCount = applySalesConditions(quote.items);
      if (matchedCount === 0) {
        toast(
          'Eşleşen ürün bulunamadı. Satış koşulları uygulanmadı.',
          'warning',
        );
        return;
      }
      setShowCartLines(true);
      toast('Satış koşulları uygulandı.', 'success');
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Satış koşulları uygulanamadı.',
        'error',
      );
    } finally {
      setIsApplyingSalesConditions(false);
    }
  };

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

  const cartPanel =
    showCartLines && lines.length > 0 ? (
      <section className="space-y-3 rounded-2xl border border-brand-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-brand-navy">Sipariş Özeti</p>
            <p className="text-xs text-brand-gray-500">
              {salesConditionsReady
                ? 'Satış koşulları ve net fiyatlar uygulandı.'
                : 'Kaydetmeden önce satış koşullarını uygulayın.'}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={() => {
              setShowCartLines(false);
            }}
          >
            Siparişe Devam Et
          </Button>
        </div>
        <ul className="space-y-1 rounded-xl border border-brand-gray-100 px-2">
          {lines.map((line) => (
            <li
              key={line.productId}
              className="border-b border-brand-gray-100 py-3 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-brand-navy">
                    {line.productName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-brand-gray-500">
                    {line.productSku}
                  </p>
                  <p className="mt-1 text-xs text-brand-gray-500">
                    Liste: {formatCurrency(
                      resolveShownListPrice(
                        line.listUnitPrice,
                        line.salesConditionsApplied ? 0 : line.unitPrice,
                      ),
                    )}
                    {line.salesConditionsApplied
                      ? ` · Net: ${formatCurrency(line.unitPrice)}`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs text-brand-gray-500">
                    {line.discountRates && line.discountRates.length > 0
                      ? `İskonto: % ${line.discountRates.join('+')}`
                      : 'İskonto: —'}
                    {` · KDV: %${line.vatRate}`}
                  </p>
                </div>
                <div className="w-32 shrink-0 text-right">
                  <p className="whitespace-nowrap text-sm font-bold tabular-nums text-brand-navy">
                    Net: {formatCurrency(line.lineTotal)}
                  </p>
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-red-600"
                    onClick={() => {
                      removeLine(line.productId);
                    }}
                  >
                    Sil
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-brand-gray-500">Adet</span>
                <MobileQtyStepper
                  value={line.quantity}
                  min={1}
                  onChange={(qty) => {
                    updateLineQuantity(line.productId, qty);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
        <MobileOrderCommercialSummary summary={commercialSummary} />
        <Input
          label="Not (opsiyonel)"
          value={notes ?? ''}
          onChange={(e) => {
            setNotes(e.target.value);
          }}
          placeholder="Teslimat notu..."
        />
      </section>
    ) : null;

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        keyboardOpen ? 'pb-2' : 'pb-56',
      )}
    >
      {showCartLines ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pb-4 pt-3">
          {cartPanel}
        </div>
      ) : (
        <>
          {/* Cari yalnızca ilk seçimde açılır; sonrasında ürün listesi ana alan kalır. */}
          {!customerId || customerPickerOpen ? (
            <div className="shrink-0 space-y-3 p-3 pb-0">
              <MobileCustomerSection
                selectedCustomerId={customerId}
                selectedCustomerName={customerName}
                selectedBranchId={branchId}
                selectedBranchName={branchName}
                onSelectCustomer={handleSelectCustomer}
                onSelectBranch={handleSelectBranch}
                onPickerOpenChange={setCustomerPickerOpen}
              />

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
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col px-3 pt-2">
            <MobileProductSection
              enabled={Boolean(customerId && branchId)}
              cartQtyByProductId={cartQtyByProductId}
              linePricingByProductId={linePricingByProductId}
              onQuantityChange={handleQuantityChange}
              onScanBarcodeClick={handleScanBarcodeClick}
              scanBarcodeBusy={isScanningBarcode}
            />
          </div>
        </>
      )}

      <MobileStickyCartBar
        isSaving={isSaving}
        isApplyingSalesConditions={isApplyingSalesConditions}
        reviewOpen={showCartLines}
        salesConditionsReady={salesConditionsReady}
        lastSavedOrderId={lastSavedOrderId}
        onSave={() => {
          void handleSave();
        }}
        onShare={handleShare}
        onOpenCartLines={() => {
          setShowCartLines(true);
        }}
        onApplySalesConditions={() => {
          void handleApplySalesConditions();
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
        onConfirmed={handleScannedProductConfirmed}
      />
    </div>
  );
}
