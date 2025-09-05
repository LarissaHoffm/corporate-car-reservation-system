import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/useAuth";
export function RoleGuard({ roles }: { roles: string[] }){
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" />;
  return roles.includes(role) ? <Outlet/> : <Navigate to="/login" />;
}
