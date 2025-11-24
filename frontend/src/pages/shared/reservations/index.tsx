import * as React from "react";
import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { statusChipClasses } from "@/components/ui/status";
import { ReservationStatusBadge } from "@/components/reservation-status-badge";
import {
  Eye,
  RefreshCcw,
  CheckCircle,
  Printer,
  CalendarCheck,
  Clock,
  XCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import useReservations from "@/hooks/use-reservations";
import type { Reservation } from "@/lib/http/reservations";
import { useToast } from "@/components/ui/use-toast";

function fmt(dt?: string) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("pt-BR");
  } catch {
    return dt;
  }
}

function period(a?: string, b?: string) {
  return `${fmt(a)} → ${fmt(b)}`;
}

type BasicStatus = "PENDING" | "APPROVED" | "CANCELED" | "COMPLETED";

function mapStatusPresentation(
  status: BasicStatus,
): {
  badgeStatus: "pending" | "approved" | "cancelled" | "inactive";
  chipLabel: "Pendente" | "Aprovado" | "Rejeitado";
  text: string;
} {
  if (status === "PENDING") {
    return {
      badgeStatus: "pending",
      chipLabel: "Pendente",
      text: "Pending",
    };
  }

  if (status === "APPROVED") {
    return {
      badgeStatus: "approved",
      chipLabel: "Aprovado",
      text: "Approved",
    };
  }

  if (status === "CANCELED") {
    return {
      badgeStatus: "cancelled",
      chipLabel: "Rejeitado",
      text: "Canceled",
    };
  }

  // COMPLETED
  return {
    badgeStatus: "approved",
    chipLabel: "Aprovado",
    text: "Completed",
  };
}

// código amigável da reserva
function makeFriendlyReservationCode(id: string): string {
  if (!id) return "RES-????????";
  const norm = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = norm.slice(-8).padStart(8, "0");
  return `RES-${suffix}`;
}

export default function AdminApproverReservationsPage() {
  const {
    items,
    loading,
    errors,
    refresh,
    refreshPending,
    listAvailableCars,
    approveReservation,
    cancelReservation,
    removeReservation,
    getReservation,
  } = useReservations();

  const { toast } = useToast();

  // detectar se está na rota de ADMIN (para RF10: excluir)
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname || "";
      setIsAdmin(path.includes("/admin/"));
    }
  }, []);

  // carregamento inicial
  useEffect(() => {
    refresh();
  }, [refresh]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | Reservation["status"]>("ALL");
  const onChangeStatus = (v: string) =>
    setStatus(v as "ALL" | Reservation["status"]);

  const filtered = useMemo(() => {
    const list = items ?? [];
    const term = q.trim().toLowerCase();
    return list
      .filter((r) => {
        if (status !== "ALL") {
          const normalizedStatus =
            r.status === "CANCELLED" ? "CANCELED" : r.status;
          if (normalizedStatus !== status) return false;
        }
        if (!term) return true;

        const friendlyCode = makeFriendlyReservationCode(r.id);

        const hay =
          `${r.id} ${friendlyCode} ${r.origin ?? ""} ${r.destination ?? ""} ${r.user?.name ?? ""} ${
            r.user?.email ?? ""
          }`.toLowerCase();
        return hay.includes(term);
      })
      .sort(
        (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
      );
  }, [items, q, status]);

  const list = items ?? [];
  const total = list.length;
  const pendingCount = list.filter((r) => r.status === "PENDING").length;
  const approvedCount = list.filter((r) => r.status === "APPROVED").length;
  const canceledCount = list.filter(
    (r) => r.status === "CANCELED" || (r.status as any) === "CANCELLED",
  ).length;

  const [viewing, setViewing] = useState<Reservation | null>(null);

  type ModalApproveState = {
    open: boolean;
    id: string | null;
    branchId?: string;
  };
  const [approveModal, setApproveModal] = useState<ModalApproveState>({
    open: false,
    id: null,
    branchId: undefined,
  });
  const [availableCars, setAvailableCars] = useState<
    { id: string; plate: string; model: string }[]
  >([]);
  const [selectedCar, setSelectedCar] = useState<string>("");

  // modal de delete no padrão do sistema
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string | null;
    label?: string;
  }>({
    open: false,
    id: null,
    label: undefined,
  });

  async function onOpenDetails(id: string) {
    try {
      const data = await getReservation(id);
      setViewing(data);
    } catch {
      toast({
        variant: "destructive",
        title: "Erro ao carregar reserva",
        description: errors.get ?? "Não foi possível carregar os detalhes.",
      });
    }
  }

  async function onOpenApprove(r: Reservation) {
    setSelectedCar("");
    setApproveModal({ open: true, id: r.id, branchId: r.branch?.id });
    try {
      const list = await listAvailableCars(
        r.branch?.id ? { branchId: r.branch.id } : undefined,
      );
      setAvailableCars(list);
    } catch {
      setAvailableCars([]);
      toast({
        variant: "destructive",
        title: "Erro ao listar veículos",
        description:
          "Não foi possível carregar os carros disponíveis para esta filial.",
      });
    }
  }

  async function onConfirmApprove() {
    if (!approveModal.id || !selectedCar) return;
    const result = await approveReservation(approveModal.id, {
      carId: selectedCar,
    });
    if (result.ok) {
      toast({
        title: "Reserva aprovada",
        description: "O veículo foi atribuído e a reserva foi aprovada.",
      });
      setApproveModal({ open: false, id: null, branchId: undefined });
      setSelectedCar("");
      await refreshPending();
      await refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Não foi possível aprovar",
        description: result.error ?? errors.approve,
      });
    }
  }

  async function onCancel(id: string) {
    const result = await cancelReservation(id);
    if (result.ok) {
      toast({
        title: "Reserva cancelada",
        description: "O status da reserva foi atualizado para CANCELED.",
      });
      await refreshPending();
      await refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Não foi possível cancelar",
        description: result.error ?? errors.cancel,
      });
    }
  }

  async function onConfirmRemove() {
    if (!deleteModal.id) return;

    // proteção extra: apenas admin deve conseguir chegar aqui
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Operação não permitida",
        description: "Apenas administradores podem excluir reservas.",
      });
      setDeleteModal({ open: false, id: null, label: undefined });
      return;
    }

    const result = await removeReservation(deleteModal.id);
    if (result.ok) {
      toast({
        title: "Reserva excluída",
        description: "A reserva foi removida definitivamente.",
      });
      setDeleteModal({ open: false, id: null, label: undefined });
      await refreshPending();
      await refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Não foi possível excluir",
        description: result.error ?? errors.remove,
      });
    }
  }

  return (
    <div className="space-y-6 px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reservations</h1>
          <p className="text-sm text-muted-foreground">
            Search and manage all reservations.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refresh()}
          disabled={loading.list}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Total Reservations
              </p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <CalendarCheck className="h-8 w-8 text-[#1558E9]" />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-[#1558E9]" />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{approvedCount}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-[#1558E9]" />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Canceled</p>
              <p className="text-2xl font-bold">{canceledCount}</p>
            </div>
            <XCircle className="h-8 w-8 text-[#1558E9]" />
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-4">
          <div className="space-y-2 md:col-span-3">
            <Label>Search</Label>
            <Input
              placeholder="Code, user, email, origin or destination…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={onChangeStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Results ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading.list ? (
            <div className="py-10 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-sm text-muted-foreground">
              No reservations found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="py-3 px-4 text-left">User</th>
                      <th className="py-3 px-4 text-left">Reservation</th>
                      <th className="py-3 px-4 text-left">Origin</th>
                      <th className="py-3 px-4 text-left">Destination</th>
                      <th className="py-3 px-4 text-left">Period</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const normalizedStatus = (
                        r.status === "CANCELLED" ? "CANCELED" : r.status
                      ) as BasicStatus;

                      const canCancel =
                        normalizedStatus === "PENDING" ||
                        normalizedStatus === "APPROVED";

                      // admin pode excluir se não estiver COMPLETED
                      const canDelete =
                        isAdmin && normalizedStatus !== "COMPLETED";

                      const deleteLabel =
                        r.user?.name ??
                        `${r.origin} → ${r.destination}` ??
                        r.id;

                      const { badgeStatus, chipLabel, text } =
                        mapStatusPresentation(normalizedStatus);

                      return (
                        <tr
                          key={r.id}
                          className="border-b border-border/50 hover:bg-background"
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium">
                              {r.user?.name ?? "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.user?.email}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {makeFriendlyReservationCode(r.id)}
                          </td>
                          <td className="py-3 px-4">{r.origin}</td>
                          <td className="py-3 px-4">{r.destination}</td>
                          <td className="py-3 px-4">
                            {period(r.startAt, r.endAt)}
                          </td>
                          <td className="py-3 px-4">
                            <ReservationStatusBadge
                              status={badgeStatus}
                              className={statusChipClasses(chipLabel)}
                            >
                              {text}
                            </ReservationStatusBadge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenDetails(r.id)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Details
                              </Button>

                              {/* Aprovar apenas se PENDING */}
                              {normalizedStatus === "PENDING" && (
                                <Button
                                  size="sm"
                                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                                  onClick={() => onOpenApprove(r)}
                                  disabled={loading.approve}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Assign & Approve
                                </Button>
                              )}

                              {/* Cancelar quando PENDING ou APPROVED */}
                              {canCancel && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => onCancel(r.id)}
                                  disabled={loading.cancel}
                                >
                                  Cancel
                                </Button>
                              )}

                              {/* Excluir (RF10) — apenas ADMIN, botão só ícone em vermelho */}
                              {canDelete && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    setDeleteModal({
                                      open: true,
                                      id: r.id,
                                      label: deleteLabel,
                                    })
                                  }
                                  disabled={loading.remove}
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                  aria-label="Delete reservation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {errors.list && (
                <p className="mt-3 text-xs text-red-600">{errors.list}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detalhes */}
      <Dialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Reservation — {viewing?.id}
            </DialogTitle>
          </DialogHeader>

          {viewing && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm text-muted-foreground">User</Label>
                  <div className="mt-1 font-medium">
                    {viewing.user?.name ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {viewing.user?.email}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">
                    Status
                  </Label>
                  {(() => {
                    const normalizedStatus = (
                      viewing.status === "CANCELLED"
                        ? "CANCELED"
                        : viewing.status
                    ) as BasicStatus;
                    const { badgeStatus, chipLabel, text } =
                      mapStatusPresentation(normalizedStatus);
                    return (
                      <ReservationStatusBadge
                        status={badgeStatus}
                        className={statusChipClasses(chipLabel)}
                      >
                        {text}
                      </ReservationStatusBadge>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Branch
                  </Label>
                  <div className="mt-1">{viewing.branch?.name ?? "—"}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Vehicle
                  </Label>
                  <div className="mt-1">
                    {viewing.car
                      ? `${viewing.car.plate} — ${viewing.car.model}`
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Origin
                  </Label>
                  <div className="mt-1">{viewing.origin}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Destination
                  </Label>
                  <div className="mt-1">{viewing.destination}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Period</Label>
                <div className="mt-1">
                  {period(viewing.startAt, viewing.endAt)}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setViewing(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Aprovar */}
      <Dialog
        open={approveModal.open}
        onOpenChange={(open) => setApproveModal((s) => ({ ...s, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign vehicle & approve</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Available car</Label>
              <Select value={selectedCar} onValueChange={setSelectedCar}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a car" />
                </SelectTrigger>
                <SelectContent>
                  {availableCars.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No available cars.
                    </div>
                  ) : (
                    availableCars.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.plate} — {c.model}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {errors.approve && (
              <p className="text-sm text-red-600">{errors.approve}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setApproveModal({
                    open: false,
                    id: null,
                    branchId: undefined,
                  })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirmApprove}
                disabled={!selectedCar || loading.approve}
                className="bg-[#1558E9] hover:bg-[#1558E9]/90"
              >
                {loading.approve ? "Approving…" : "Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Remover (padrão igual ao delete-dialog.tsx) */}
      <Dialog
        open={deleteModal.open}
        onOpenChange={(open) =>
          !loading.remove &&
          setDeleteModal((prev) => ({
            ...prev,
            open,
          }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover reserva</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{deleteModal.label ?? "esta reserva"}</strong>? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteModal({ open: false, id: null, label: undefined })
              }
              disabled={loading.remove}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmRemove}
              disabled={loading.remove}
            >
              {loading.remove ? "Removendo..." : "Remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
