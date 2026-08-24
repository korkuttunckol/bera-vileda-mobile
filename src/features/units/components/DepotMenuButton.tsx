import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { ROUTES } from '@/shared/constants/routes';

export function DepotMenuButton() {
  const navigate = useNavigate();
  return (
    <Button type="button" size="sm" variant="outline" onClick={() => { void navigate(ROUTES.DEPOT); }}>
      ← Menü
    </Button>
  );
}
