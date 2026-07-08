import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRole?: UserRole;
}

export function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRole && user.role !== allowedRole) {
    const redirect = user.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    const redirect = user.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}

export function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
}
