import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { ROUTES } from '@/shared/constants/routes';
import { useAuth } from '../hooks/useAuth';
import { canAccessAdminPanel } from '../permissions';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner label="Yetki kontrol ediliyor..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!canAccessAdminPanel(user)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
}
