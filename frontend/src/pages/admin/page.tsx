import * as React from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Car, Calendar, FileCheck } from "lucide-react";

import useReservations from "@/hooks/use-reservations";
import type { Reservation } from "@/lib/http/reservations";
import { CarsAPI } from "@/lib/http/cars";
import { api } from "@/lib/http/api";
import {
  listDocumentsByReservation,
  type Document as ApiDocument,
} from "@/lib/http/documents";

type BasicStatus = "PENDING" | "APPROVED" | "CANCELED" | "COMPLETED";

/**
 * Classes de chip de status (mantidas do design original)
 */
function statusChipClasses(s: string) {
  const n = s.toLowerCase();
  if (n.includes("confirm"))
    return "bg-green-100 text-green-800 border border-green-200 dark:bg-green-400/15 dark:text-green-500 dark:border-green-500/20";
  if (n.includes("pend"))
    return "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-400/15 dark:text-amber-500 dark:border-amber-500/20";
  if (n.includes("cancel"))
    return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-400/15 dark:text-red-500 dark:border-red-500/20";
  return "bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-400/15 dark:text-zinc-500 dark:border-zinc-500/20";
}

function normalizeReservationStatus(status: string): BasicStatus {
  const s = status?.toString().toUpperCase() ?? "";
  if (s === "PENDING") return "PENDING";
  if (s === "APPROVED") return "APPROVED";
  if (s === "COMPLETED") return "COMPLETED";
  // CANCELED / CANCELLED / qualquer outra variação
  return "CANCELED";
}

/**
 * Mapeia status técnico (PENDING / APPROVED / CANCELED / COMPLETED)
 * para os rótulos em pt-BR usados pelo design original.
 */
function mapReservationStatusToLabel(status: string): string {
  const s = status?.toString().toUpperCase() ?? "";

  if (s === "PENDING") return "Pendente";
  if (s === "APPROVED") return "Confirmado";
  if (s === "COMPLETED") return "Confirmado";
  if (s === "CANCELED" || s === "CANCELLED" || s === "REJECTED")
    return "Cancelado";

  return status || "—";
}

/**
 * Normaliza status de documentos (igual lógica do Approver)
 */
function normalizeDocStatus(raw: any): "PENDING" | "APPROVED" | "REJECTED" {
  if (raw == null) return "PENDING";

  const s = String(raw).toUpperCase();
  if (s === "APPROVED" || s === "VALIDATED" || s === "APPROVE") {
    return "APPROVED";
  }
  if (s === "REJECTED" || s === "REJECT") {
    return "REJECTED";
  }
  return "PENDING";
}

function fmtDateTime(dt?: string) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("pt-BR");
  } catch {
    return dt;
  }
}

/**
 * ID amigável de reserva — mesma regra usada nas outras telas.
 * É *somente* baseado no ID bruto, então fica igual para todos os usuários.
 */
function makeFriendlyReservationCode(id: string): string {
  if (!id) return "RES-????????";
  const norm = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = norm.slice(-8).padStart(8, "0");
  return `RES-${suffix}`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { items, loading, errors, refresh } = useReservations();

  const [totalFleet, setTotalFleet] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);

  const [extraLoading, setExtraLoading] = useState({
    fleet: false,
    users: false,
    reviews: false,
  });

  const list = items ?? [];

  // Carrega reservas para o dashboard
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Total Fleet
  useEffect(() => {
    async function loadFleet() {
      setExtraLoading((s) => ({ ...s, fleet: true }));
      try {
        const cars = await CarsAPI.list();
        setTotalFleet(Array.isArray(cars) ? cars.length : 0);
      } catch {
        setTotalFleet(0);
      } finally {
        setExtraLoading((s) => ({ ...s, fleet: false }));
      }
    }

    void loadFleet();
  }, []);

  // Total Users
  useEffect(() => {
    async function loadUsers() {
      setExtraLoading((s) => ({ ...s, users: true }));
      try {
        const { data } = await api.get("/users");
        let count = 0;

        if (Array.isArray(data)) {
          count = data.length;
        } else if (data && Array.isArray((data as any).items)) {
          count = (data as any).items.length;
        } else if (data && typeof (data as any).total === "number") {
          count = (data as any).total;
        }

        setTotalUsers(count);
      } catch {
        setTotalUsers(0);
      } finally {
        setExtraLoading((s) => ({ ...s, users: false }));
      }
    }

    void loadUsers();
  }, []);

  // Pending Reviews (documentos pendentes de validação)
  useEffect(() => {
    async function loadPendingReviews() {
      if (!list.length) {
        setPendingReviews(0);
        return;
      }

      setExtraLoading((s) => ({ ...s, reviews: true }));

      try {
        let total = 0;

        for (const r of list) {
          try {
            const docs: ApiDocument[] = await listDocumentsByReservation(r.id);
            const pendings = docs.filter(
              (d) => normalizeDocStatus((d as any).status) === "PENDING",
            );
            total += pendings.length;
          } catch {
            // ignora falha por reserva individual
          }
        }

        setPendingReviews(total);
      } catch {
        setPendingReviews(0);
      } finally {
        setExtraLoading((s) => ({ ...s, reviews: false }));
      }
    }

    void loadPendingReviews();
  }, [list]);

  // Active Reservations = PENDING + APPROVED
  const activeReservationsCount = useMemo(
    () =>
      list.filter((r) => {
        const s = normalizeReservationStatus((r as any).status);
        return s === "PENDING" || s === "APPROVED";
      }).length,
    [list],
  );

  // Reservas recentes (ordenadas por startAt desc, limita a 7 para manter proporção do layout)
  const recentReservations: Reservation[] = useMemo(
    () =>
      [...list]
        .sort(
          (a, b) =>
            new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
        )
        .slice(0, 7),
    [list],
  );

  // Cards (agora com valores reais)
  const stats = useMemo(
    () => [
      {
        title: "Total Fleet",
        value: String(totalFleet),
        icon: Car,
        color: "text-blue-600",
        to: "/admin/fleet",
      },
      {
        title: "Active Reservations",
        value: String(activeReservationsCount),
        icon: Calendar,
        color: "text-green-600",
        to: "/admin/reservations",
      },
      {
        title: "Total Users",
        value: String(totalUsers),
        icon: Users,
        color: "text-purple-600",
        to: "/admin/users",
      },
      {
        title: "Pending Reviews",
        value: String(pendingReviews),
        icon: FileCheck,
        color: "text-orange-600",
        to: "/admin/documents",
      },
    ],
    [totalFleet, activeReservationsCount, totalUsers, pendingReviews],
  );

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, to: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(to);
      }
    },
    [navigate],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your corporate car reservation system.
        </p>
      </div>

      {/* Stats Grid – mantém o design, agora com dados reais */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            role="button"
            tabIndex={0}
            onClick={() => navigate(stat.to)}
            onKeyDown={(e) => onKey(e, stat.to)}
            className="cursor-pointer border-border/50 shadow-sm transition hover:bg-card/60
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1558E9] focus-visible:ring-offset-0"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Cards – sem mudanças de design */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-0 bg-[#1558E9] shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white">Users Management</h3>
                <p className="text-sm text-blue-100">
                  Review and approve new user registrations.
                </p>
              </div>
              <Button
                className="w-full bg-card text-[#1558E9] hover:bg-card"
                onClick={() => navigate("/admin/users")}
              >
                Review Now
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">
                  Fleet Management
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add, edit, or remove vehicles from your fleet.
                </p>
              </div>
              <Button
                className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90"
                onClick={() => navigate("/admin/fleet")}
              >
                Manage Fleet
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">Usage Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Access detailed reports on car usage and availability.
                </p>
              </div>
              <Button
                className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90"
                onClick={() => navigate("/admin/reports")}
              >
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reservations – agora puxando do backend, mantendo layout e chips originais */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-w-full rounded-md border border-border/50">
            <div className="overflow-x-auto">
              <div className="max-h-80 overscroll-contain overflow-y-auto">
                {loading.list ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    Loading recent reservations…
                  </div>
                ) : recentReservations.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No reservations found.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="sticky top-0 z-10 border-b border-border/50 bg-background">
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                          RESERVATION ID
                        </th>
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                          CAR MODEL
                        </th>
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                          USER
                        </th>
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                          PICK-UP DATE
                        </th>
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                          RETURN DATE
                        </th>
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                          STATUS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReservations.map((r) => {
                        const label = mapReservationStatusToLabel(
                          (r as any).status,
                        );

                        return (
                          <tr
                            key={r.id}
                            className="border-b border-border/50 hover:bg-card/50"
                          >
                            <td className="py-3 px-4 text-sm font-medium text-foreground">
                              {makeFriendlyReservationCode(r.id)}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              {r.car?.model ?? "—"}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              {r.user?.name ?? "—"}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              {fmtDateTime(r.startAt)}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">
                              {fmtDateTime(r.endAt)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={statusChipClasses(label)}>
                                {label}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {errors.list && !loading.list && (
                  <p className="px-4 pb-3 pt-1 text-xs text-red-600">
                    {errors.list}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
