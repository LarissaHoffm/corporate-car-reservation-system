import React from "react";
import { cn } from "@/lib/auth/utils";

type VehicleStatus = "available" | "maintenance" | "unavailable";

const styles: Record<VehicleStatus, string> = {
  available:
    "bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30",
  maintenance:
    "bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-400/30",
  unavailable:
    "bg-rose-400/15 text-rose-300 ring-1 ring-inset ring-rose-400/30",
};

export function VehicleStatusBadge({
  status,
  className,
  children,
}: {
  status: VehicleStatus;
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
