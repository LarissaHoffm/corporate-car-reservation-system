import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth/useAuth";

type Role = "ADMIN" | "APPROVER" | "REQUESTER";

type Props = {
  allowedRoles?: Role[];
  requireAuth?: boolean; // default true
  children: ReactNode;
};

function homeFor(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "APPROVER") return "/approver";
  return "/requester";
}

export function RoleGuard({
  allowedRoles,
  requireAuth = true,
  children,
}: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!requireAuth) return <>{children}</>;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role as Role)
  ) {
    return (
      <Navigate
        to="/forbidden"
        replace
        state={{ from: location, home: homeFor(user.role as Role) }}
      />
    );
  }

  return <>{children}</>;
}

export default RoleGuard;
