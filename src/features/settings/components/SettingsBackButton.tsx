import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';

interface SettingsBackButtonProps {
  to?: string;
}

export function SettingsBackButton({ to = ROUTES.SETTINGS }: SettingsBackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => void navigate(to)}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-gray-500 hover:bg-brand-gray-100"
      aria-label="Geri dön"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
}
