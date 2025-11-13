import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth/useAuth";

type Role = "ADMIN" | "APPROVER" | "REQUESTER";

type Props = {
  roles?: Role[];
  allowedRoles?: Role[];
  requireAuth?: boolean;
  fallbackPath?: string;
  forbiddenPath?: string;
  children?: React.ReactNode;
};

export default function ProtectedRoute({
  roles,
  allowedRoles,
  requireAuth = true,
  fallbackPath = "/login",
  forbiddenPath = "/",
  children,
}: Props) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!requireAuth) return <>{children ?? <Outlet />}</>;

  if (!user) return <Navigate to={fallbackPath} replace />;

  const list = roles ?? allowedRoles;
  if (list && list.length > 0 && !list.includes(user.role as Role)) {
    return <Navigate to={forbiddenPath} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
