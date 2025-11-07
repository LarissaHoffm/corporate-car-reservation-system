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

  // silent re-auth
  if (loading) return null;

  // sem sessão -> manda pro login preservando origem
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // força troca de senha antes de qualquer área protegida
  const isOnChangePwd = location.pathname === "/change-password";
  if (user.mustChangePassword && !isOnChangePwd) {
    return <Navigate to="/change-password" replace />;
  }

  // checagem de papeis 
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role as Role)) {
    return <Navigate to={homeFor(user.role as Role)} replace />;
  }

  return <>{children}</>;
}

export default RoleGuard;
