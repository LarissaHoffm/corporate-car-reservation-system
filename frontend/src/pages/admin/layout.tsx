import { RoleGuard } from "@/components/role-guard";
import { AppShell } from "@/components/app-shell";

export default function AdminLayout() {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <AppShell baseHref="/admin" fallbackInitials="AD" />
    </RoleGuard>
  );
}
