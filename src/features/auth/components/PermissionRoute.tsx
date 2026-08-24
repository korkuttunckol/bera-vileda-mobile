import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/shared/components/feedback/LoadingSpinner';
import { ROUTES } from '@/shared/constants/routes';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, type Permission } from '../permissions';

interface PermissionRouteProps {
  permission: Permission;
  children: ReactNode;
}

/** Rota bazında yalnızca gereken işlem yetkisini kontrol eder. */
export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullPage label="Yetki kontrol ediliyor..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!hasPermission(user, permission)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
}
