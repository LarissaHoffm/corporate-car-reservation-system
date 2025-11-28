import { RoleGuard } from "@/components/role-guard";
import { AppShell } from "@/components/app-shell";

export default function ApproverLayout() {
  return (
    <RoleGuard allowedRoles={["APPROVER"]}>
      <AppShell baseHref="/approver" fallbackInitials="AP" />
    </RoleGuard>
  );
}
