import * as React from "react";
import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { statusChipClasses } from "@/components/ui/status";
import {
  Eye,
  RefreshCcw,
  CheckCircle,
  Printer,
  Filter,
  CalendarCheck,
  Clock,
  XCircle,
  ShieldCheck,
} from "lucide-react";

import useReservations from "@/hooks/use-reservations";
import type { Reservation } from "@/lib/http/reservations";

// ---- helpers
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
function chip(status: Reservation["status"]) {
  // mapeia para o mesmo esquema visual usado no restante do app
  return statusChipClasses(
    status === "PENDING"
      ? "Warning"
      : status === "APPROVED"
      ? "Active"
      : status === "COMPLETED"
      ? "Success"
      : "Inactive"
  );
}

// ---- componente
export default function AdminApproverReservationsPage() {
  const {
    items,
    loading,
    errors,
    refresh,            // lista geral (todas)
    refreshPending,     // se quiser atualizar só pendentes em algum momento
    listAvailableCars,  // carros disponíveis (pode usar branchId)
    approveReservation, // aprova com { carId }
    cancelReservation,  // cancela
    getReservation,     // detalhe (para o modal)
  } = useReservations();

  // carregamento inicial
  useEffect(() => {
    refresh();
  }, [refresh]);

  // ---------- filtros (client-side) ----------
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | Reservation["status"]>("ALL");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (items ?? [])
      .filter((r) => {
        if (status !== "ALL" && r.status !== status) return false;
        if (!term) return true;
        const hay =
          `${r.id} ${r.origin ?? ""} ${r.destination ?? ""} ${r.user?.name ?? ""} ${r.user?.email ?? ""}`.toLowerCase();
        return hay.includes(term);
      })
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  }, [items, q, status]);

  // ---------- métricas ----------
  const total = items.length;
  const pendingCount = items.filter((r) => r.status === "PENDING").length;
  const approvedCount = items.filter((r) => r.status === "APPROVED").length;
  const canceledCount = items.filter((r) => r.status === "CANCELED").length;

  // ---------- state modais ----------
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

  // ---------- ações ----------
  async function onOpenDetails(id: string) {
    try {
      const data = await getReservation(id);
      setViewing(data);
    } catch {
      // erro já fica em errors.get via hook
    }
  }

  async function onOpenApprove(r: Reservation) {
    setSelectedCar("");
    setApproveModal({ open: true, id: r.id, branchId: r.branch?.id });
    try {
      const list = await listAvailableCars(r.branch?.id ? { branchId: r.branch.id } : undefined);
      setAvailableCars(list);
    } catch {
      setAvailableCars([]);
    }
  }

  async function onConfirmApprove() {
    if (!approveModal.id || !selectedCar) return;
    const ok = await approveReservation(approveModal.id, { carId: selectedCar });
    if (ok.ok) {
      setApproveModal({ open: false, id: null, branchId: undefined });
      setSelectedCar("");
      await refreshPending();
      await refresh();
    }
  }

  async function onCancel(id: string) {
    const ok = await cancelReservation(id);
    if (ok.ok) {
      await refresh();
    }
  }

  // ---------- UI ----------
  return (
    <div className="mx-auto p-6 max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reservations</h1>
          <p className="text-sm text-muted-foreground">Search and manage all reservations.</p>
        </div>
        <Button variant="outline" onClick={() => refresh()} disabled={loading.list}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Reservations</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <CalendarCheck className="h-8 w-8 text-[#1558E9]" />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-[#1558E9]" />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{approvedCount}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-[#1558E9]" />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
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
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Label>Search</Label>
            <Input
              placeholder="Code, user, email, origin or destination…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10"
            />
            <Filter className="h-4 w-4 absolute left-3 top-[38px] text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
          <CardTitle className="text-base">Results ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading.list ? (
            <div className="py-10 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-sm text-muted-foreground">No reservations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Origin</th>
                    <th className="text-left py-3 px-4">Destination</th>
                    <th className="text-left py-3 px-4">Period</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-background">
                      <td className="py-3 px-4">
                        <div className="font-medium">{r.user?.name ?? r.userId}</div>
                        <div className="text-xs text-muted-foreground">{r.user?.email}</div>
                      </td>
                      <td className="py-3 px-4">{r.origin}</td>
                      <td className="py-3 px-4">{r.destination}</td>
                      <td className="py-3 px-4">{period(r.startAt, r.endAt)}</td>
                      <td className="py-3 px-4">
                        <Badge className={chip(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => onOpenDetails(r.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>

                          {/* Aprovar apenas se PENDING */}
                          {r.status === "PENDING" && (
                            <Button
                              size="sm"
                              className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                              onClick={() => onOpenApprove(r)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Assign & Approve
                            </Button>
                          )}

                          {/* Cancelar quando PENDING ou APPROVED */}
                          {(r.status === "PENDING" || r.status === "APPROVED") && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onCancel(r.id)}
                              disabled={loading.cancel}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {errors.list && <p className="text-xs text-red-600 mt-3">{errors.list}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detalhes */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Reservation — {viewing?.id}
            </DialogTitle>
          </DialogHeader>

          {viewing && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">User</Label>
                  <div className="mt-1 font-medium">{viewing.user?.name ?? viewing.userId}</div>
                  <div className="text-sm text-muted-foreground">{viewing.user?.email}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Badge className={chip(viewing.status)}>{viewing.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Branch</Label>
                  <div className="mt-1">{viewing.branch?.name ?? "—"}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Vehicle</Label>
                  <div className="mt-1">
                    {viewing.car ? `${viewing.car.plate} — ${viewing.car.model}` : "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Origin</Label>
                  <div className="mt-1">{viewing.origin}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Destination</Label>
                  <div className="mt-1">{viewing.destination}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Period</Label>
                <div className="mt-1">{period(viewing.startAt, viewing.endAt)}</div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setViewing(null)}>
                  Close
                </Button>
                <Button onClick={() => window.print()} className="bg-[#1558E9] hover:bg-[#1558E9]/90">
                  <Printer className="h-4 w-4 mr-2" />
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
                <SelectTrigger><SelectValue placeholder="Select a car" /></SelectTrigger>
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

            {errors.approve && <p className="text-sm text-red-600">{errors.approve}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setApproveModal({ open: false, id: null, branchId: undefined })
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
    </div>
  );
}
