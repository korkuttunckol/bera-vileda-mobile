import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  to?: string;
  label?: string;
  onClick?: () => void;
}

export function BackButton({ to, label = 'Geri', onClick }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = (): void => {
    if (onClick) {
      onClick();
      return;
    }
    if (to) {
      void navigate(to);
      return;
    }
    void navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-gray-600 hover:bg-brand-gray-100"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}
