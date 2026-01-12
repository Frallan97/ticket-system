import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'customer' | 'organizer' | 'admin';
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
