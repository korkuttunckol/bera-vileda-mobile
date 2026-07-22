import { useEffect, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-brand-navy/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 w-full rounded-t-2xl bg-white shadow-modal sm:rounded-2xl',
          'max-h-[90vh] overflow-y-auto',
          sizeStyles[size],
          'mx-4 mb-0 sm:mb-4',
        )}
      >
        <div className="sticky top-0 border-b border-brand-gray-200 bg-white px-4 py-4 sm:px-6">
          <h2 id="modal-title" className="text-lg font-semibold text-brand-navy">
            {title}
          </h2>
        </div>
        <div className="px-4 py-4 sm:px-6">{children}</div>
        {footer ? (
          <div className="sticky bottom-0 border-t border-brand-gray-200 bg-brand-gray-50 px-4 py-3 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  variant = 'primary',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            fullWidth
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {typeof message === 'string' ? (
        <p className="text-sm text-brand-gray-600">{message}</p>
      ) : (
        message
      )}
    </Modal>
  );
}
