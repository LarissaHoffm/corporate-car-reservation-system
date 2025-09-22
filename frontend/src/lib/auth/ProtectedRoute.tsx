import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth/useAuth";

export default function ProtectedRoute({ roles }: { roles?: Array<"ADMIN"|"APPROVER"|"REQUESTER"> }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) return null; // pode trocar por skeleton/spinner
  if (!user) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0 && !hasRole(roles)) {
    // logged but forbidden
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
