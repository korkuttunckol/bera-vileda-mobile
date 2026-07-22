interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullPage?: boolean;
}

const sizeStyles = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

export function LoadingSpinner({
  size = 'md',
  label,
  fullPage = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`animate-spin rounded-full border-brand-navy border-t-transparent ${sizeStyles[size]}`}
        role="status"
        aria-label={label ?? 'Yükleniyor'}
      />
      {label ? (
        <p className="text-sm text-brand-gray-500">{label}</p>
      ) : null}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
