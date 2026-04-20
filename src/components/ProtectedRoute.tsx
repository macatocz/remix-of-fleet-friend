import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, roles } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/prihlaseni" replace />;
  }

  // Driver-only users go to mobile UI
  const isDriverOnly = roles.length > 0
    && roles.includes("ridic")
    && !roles.includes("admin")
    && !roles.includes("dispatcer");

  if (isDriverOnly && !location.pathname.startsWith("/m")
    && !location.pathname.startsWith("/vozidla/")) {
    return <Navigate to="/m" replace />;
  }

  return <>{children}</>;
}
