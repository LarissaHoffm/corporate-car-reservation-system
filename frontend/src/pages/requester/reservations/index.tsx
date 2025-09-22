import * as React from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Printer, XCircle, Plus } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { statusChipClasses } from "@/components/ui/status";
import { useToast } from "@/hooks/use-toast";

type ReservStatus =
  | "Solicitado"
  | "Enviado p/ aprovação"
  | "Aprovado"
  | "Em Progresso"
  | "Concluída"
  | "Rejeitado"
  | "Cancelada";

type Reservation = {
  id: string;
  userName?: string;
  userEmail?: string;
  branch?: string;
  carModel: string;
  plate: string;
  origin?: string;
  startISO: string;
  endISO: string;
  status: ReservStatus;
};

const LS_KEY = "reservcar:req:reservations";

const SEED: Reservation[] = [
  {
    id: "R2023001",
    userName: "Diana Prince",
    userEmail: "diana.prince@reservcar.com",
    branch: "JLLE",
    carModel: "Ford Focus",
    plate: "FOC-9090",
    origin: "JLLE",
    startISO: "2025-10-27T13:30:00",
    endISO: "2025-10-27T18:00:00",
    status: "Rejeitado",
  },
  {
    id: "48293",
    userName: "Alex Morgan",
    userEmail: "alex.morgan@reservcar.com",
    branch: "CWB",
    carModel: "Toyota Corolla",
    plate: "7FJ-392",
    origin: "CWB",
    startISO: "2025-08-04T09:00:00",
    endISO: "2025-08-07T18:00:00",
    status: "Em Progresso",
  },
  {
    id: "48294",
    userName: "Alex Morgan",
    userEmail: "alex.morgan@reservcar.com",
    branch: "CWB",
    carModel: "Honda Civic",
    plate: "8GK-493",
    origin: "CWB",
    startISO: "2025-08-07T13:30:00",
    endISO: "2025-08-09T18:00:00",
    status: "Aprovado",
  },
];

function load(): Reservation[] {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (!s) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(s) as Reservation[];
  } catch {
    return SEED;
  }
}
function save(list: Reservation[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function fmt(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString();
}
function pickupMinus30(startISO: string) {
  const d = new Date(startISO);
  d.setMinutes(d.getMinutes() - 30);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function RequesterReservationsList() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState<Reservation[]>(load());
  const [carFilter, setCarFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ReservStatus>("all");

  const [openDossier, setOpenDossier] = useState(false);
  const [selected, setSelected] = useState<Reservation | null>(null);

  const carOptions = useMemo(
    () => ["all", ...Array.from(new Set(reservations.map((r) => r.carModel)))],
    [reservations],
  );

  const filtered = useMemo(
    () =>
      reservations.filter((r) => {
        const byCar = carFilter === "all" || r.carModel === carFilter;
        const byStatus = statusFilter === "all" || r.status === statusFilter;
        return byCar && byStatus;
      }),
    [reservations, carFilter, statusFilter],
  );

  function openView(r: Reservation) {
    setSelected(r);
    setOpenDossier(true);
  }

  function handleCancel(r: Reservation) {
    if (!confirm(`Cancelar a reserva #${r.id}?`)) return;
    const upd = reservations.map((x) => (x.id === r.id ? { ...x, status: "Cancelada" as ReservStatus } : x));
    setReservations(upd);
    save(upd);
    toast({ title: "Reservation cancelled", description: `A reserva #${r.id} foi cancelada.` });
  }

  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">My Reservations</h1>

          <div className="flex items-center gap-3">
            <Select value={carFilter} onValueChange={setCarFilter}>
              <SelectTrigger className="w-[200px] border-border/50">
                <SelectValue placeholder="Car" />
              </SelectTrigger>
              <SelectContent>
                {carOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "all" ? "All cars" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px] border-border/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="Solicitado">Solicitado</SelectItem>
                <SelectItem value="Enviado p/ aprovação">Enviado p/ aprovação</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Em Progresso">Em Progresso</SelectItem>
                <SelectItem value="Concluída">Concluída</SelectItem>
                <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="bg-[#1558E9] hover:bg-[#1558E9]/90"
              onClick={() => navigate("/requester/reservations/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Button>
          </div>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Reservations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border/50 bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Car
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      From
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-card/50">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{r.id}</td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {r.carModel} — {r.plate}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{fmt(r.startISO)}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{fmt(r.endISO)}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusChipClasses(r.status as any)}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-transparent border-border/50"
                            onClick={() => {
                              setSelected(r);
                              setOpenDossier(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>

                          {r.status !== "Cancelada" && r.status !== "Concluída" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-transparent border-rose-200 text-rose-600 hover:bg-rose-50"
                              onClick={() => handleCancel(r)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          )}

                          {(r.status === "Aprovado" || r.status === "Em Progresso") && (
                            <Button
                              size="sm"
                              className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                              onClick={() => navigate(`/requester/reservations/${r.id}/upload`)}
                            >
                              Finalize
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/requester/reservations/${r.id}`)}
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No reservations found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={openDossier} onOpenChange={setOpenDossier}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Reservation dossier — <span className="font-mono">{selected?.id}</span>
              </DialogTitle>
            </DialogHeader>

            {selected && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                <div>
                  <div className="text-sm text-muted-foreground">User</div>
                  <div className="mt-1 font-medium text-foreground">{selected.userName ?? "—"}</div>
                  <div className="text-sm text-muted-foreground">{selected.userEmail ?? "—"}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <Badge className={statusChipClasses(selected.status as any)}>{selected.status}</Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Filial</div>
                  <div className="mt-1 text-foreground">{selected.branch ?? "—"}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Vehicle</div>
                  <div className="mt-1 text-foreground">
                    {selected.carModel} — {selected.plate}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Saída</div>
                  <div className="mt-1 text-foreground">{fmt(selected.startISO)}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Pickup time</div>
                  <div className="mt-1 text-foreground">{pickupMinus30(selected.startISO)}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Volta</div>
                  <div className="mt-1 text-foreground">{fmt(selected.endISO)}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Origem</div>
                  <div className="mt-1 text-foreground">{selected.origin ?? "—"}</div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpenDossier(false)}>
                    Close
                  </Button>
                  <Button onClick={() => window.print()} className="bg-[#1558E9] hover:bg-[#1558E9]/90">
                    <Printer className="h-4 w-4 mr-2" />
                    Print dossier
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
