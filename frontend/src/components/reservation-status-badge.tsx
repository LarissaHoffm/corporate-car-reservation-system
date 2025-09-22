import React from "react";
import { cn } from "@/lib/auth/utils";

type ReservationStatus = "pending" | "approved" | "cancelled" | "inactive";

const styles: Record<ReservationStatus, string> = {
  pending:
    "bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-400/30",
  approved:
    "bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30",
  cancelled:
    "bg-rose-400/15 text-rose-300 ring-1 ring-inset ring-rose-400/30",
  inactive:
    "bg-zinc-400/15 text-zinc-300 ring-1 ring-inset ring-zinc-400/30",
};

export function ReservationStatusBadge({
  status,
  className,
  children,
}: {
  status: ReservationStatus;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        styles[status],
        className
      )}
    >
      {children}
    </span>
  );
}
