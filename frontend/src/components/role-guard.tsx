import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type Role = "ADMIN" | "APPROVER" | "REQUESTER";

type Props = { allowedRoles?: Role[]; children: ReactNode };

function homeFor(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "APPROVER") return "/approver";
  return "/requester";
}

export function RoleGuard({ allowedRoles, children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  return <>{children}</>;
}

export default RoleGuard;
