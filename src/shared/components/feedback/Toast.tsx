import { useToastStore, type ToastVariant } from '@/stores/toastStore';
import { cn } from '@/shared/utils/cn';

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  info: 'border-brand-gray-200 bg-white text-brand-gray-700',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-[60] flex flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:w-80"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center justify-between rounded-lg border px-4 py-3 shadow-modal',
            variantStyles[t.variant],
          )}
        >
          <span className="text-sm font-medium">{t.message}</span>
          <button
            onClick={() => { removeToast(t.id); }}
            className="ml-3 shrink-0 opacity-60 hover:opacity-100"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
