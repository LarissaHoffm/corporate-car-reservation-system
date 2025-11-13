import { useMemo } from "react";
import type { User } from "@/lib/http/users";

export function useUsersStats(users: User[]) {
  return useMemo(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();

    const total = users.length;
    const active = users.filter((u) => u.status === "ACTIVE").length;
    const activeThisMonth = users.filter((u) => {
      if (u.status !== "ACTIVE" || !u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d.getUTCFullYear() === y && d.getUTCMonth() === m;
    }).length;

    return { total, active, activeThisMonth };
  }, [users]);
}
