import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Do not render protected content while session verification is in-flight
  if (isLoading) {
    return (
      <div 
        id="auth-loading-screen" 
        className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-slate-300"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium tracking-wide">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated requests to login, preserving intended target location
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
