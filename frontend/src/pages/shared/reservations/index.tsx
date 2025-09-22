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
import { RoleGuard } from "@/components/role-guard";
import {
  Eye,
  Pencil,
  CheckCircle2,
  Printer,
  User2,
  Filter,
  CalendarCheck,
  Clock,
  XCircle,
  UserCheck,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";


type ReservationStatus = "Pendente" | "Aprovado" | "Rejeitado" | "Cancelado";

type Reservation = {
  id: string;
  user: string;
  email: string;
  filial: string;
  carModel: string;
  plate: string;
  outDate: string;    // YYYY-MM-DD
  outTime: string;    // HH:mm
  returnDate: string; // YYYY-MM-DD
  returnTime: string; // HH:mm
  status: ReservationStatus;
  pickupTime?: string; // HH:mm (−30min de outTime)
  approvedBy?: string;
};

const BRANCHES = ["JLLE", "CWB", "MGA", "POA", "SP", "RJ", "CXS", "RBP"] as const;

const FLEET = [
  { model: "Honda Civic", plate: "ABC-1234" },
  { model: "Toyota Corolla", plate: "DEF-5678" },
  { model: "Tesla Model 3", plate: "TES-3003" },
  { model: "Ford Focus", plate: "FOC-9090" },
  { model: "VW Golf", plate: "VWG-7788" },
] as const;

const FLEET_MODEL_LIST = FLEET.map((f) => f.model);

const getPlateByModel = (model: string) =>
  FLEET.find((f) => f.model === model)?.plate ?? "";

const timeMinus30 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() - 30);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const LS_KEY = "shared-reservations";

// seed inicial
const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: "R2023001",
    user: "Diana Prince",
    email: "diana.prince@reservcar.com",
    filial: "Centro",
    carModel: "Honda Civic",
    plate: "ABC-1234",
    outDate: "2025-10-27",
    outTime: "13:30",
    returnDate: "2025-10-27",
    returnTime: "18:00",
    status: "Pendente",
  },
  {
    id: "R2023002",
    user: "Bruce Wayne",
    email: "bruce.wayne@reservcar.com",
    filial: "JLLE",
    carModel: "Toyota Corolla",
    plate: "DEF-5678",
    outDate: "2025-10-28",
    outTime: "09:00",
    returnDate: "2025-10-28",
    returnTime: "12:00",
    status: "Pendente",
  },
  {
    id: "R2023003",
    user: "Clark Kent",
    email: "clark.kent@reservcar.com",
    filial: "CWB",
    carModel: "Tesla Model 3",
    plate: "TES-3003",
    outDate: "2025-10-29",
    outTime: "14:15",
    returnDate: "2025-10-29",
    returnTime: "18:15",
    status: "Aprovado",
    pickupTime: "13:45",
    approvedBy: "Alex Morgan",
  },
];

function readLS(): Reservation[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return INITIAL_RESERVATIONS;
    return JSON.parse(raw) as Reservation[];
  } catch {
    return INITIAL_RESERVATIONS;
  }
}

function saveLS(data: Reservation[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export default function SharedReservationsPage() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const [reservations, setReservations] = useState<Reservation[]>(() => readLS());

  // filtros
  const [search, setSearch] = useState("");
  const [fFilial, setFFilial] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");

  // modais
  const [viewing, setViewing] = useState<Reservation | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [approving, setApproving] = useState<Reservation | null>(null);

  // edição 
  const [editDraft, setEditDraft] = useState<Reservation | null>(null);

  const total = reservations.length;
  const pendingCount = reservations.filter((r) => r.status === "Pendente").length;
  const approvedCount = reservations.filter((r) => r.status === "Aprovado").length;
  const rejectedCount = reservations.filter((r) => r.status === "Rejeitado").length;

  // filtro memoizado
  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const s = search.trim().toLowerCase();
      const sOK =
        !s ||
        r.id.toLowerCase().includes(s) ||
        r.user.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        r.carModel.toLowerCase().includes(s) ||
        r.plate.toLowerCase().includes(s);

      const filialOK = fFilial === "all" || r.filial === fFilial;
      const statusOK = fStatus === "all" || r.status.toLowerCase() === fStatus;

      return sOK && filialOK && statusOK;
    });
  }, [reservations, search, fFilial, fStatus]);

  useEffect(() => saveLS(reservations), [reservations]);

  function openView(r: Reservation) {
    setViewing(r);
  }

  function openEdit(r: Reservation) {
    setEditing(r);
    setEditDraft({ ...r });
  }

  function cancelEdit() {
    setEditing(null);
    setEditDraft(null);
  }

  function saveEdit() {
    if (!editDraft) return;
    setReservations((prev) => prev.map((x) => (x.id === editDraft.id ? { ...editDraft } : x)));
    setEditing(null);
    setEditDraft(null);
    toast({ title: "Reserva atualizada" });
  }

  function openApprove(r: Reservation) {
    setApproving(r);
  }

  function approveNow() {
    if (!approving) return;
    const approvedBy = authUser?.name || "Aprovador";
    const pickup = timeMinus30(approving.outTime);

    setReservations((prev) =>
      prev.map((x) =>
        x.id === approving.id
          ? { ...x, status: "Aprovado", pickupTime: pickup, approvedBy }
          : x
      )
    );

    setApproving(null);
    toast({
      title: "Reserva aprovada",
      description: `Pickup time definido para ${pickup}`,
    });
  }

  function rejectNow() {
    if (!approving) return;
    setReservations((prev) =>
      prev.map((x) => (x.id === approving.id ? { ...x, status: "Rejeitado" } : x))
    );
    setApproving(null);
    toast({ title: "Reserva rejeitada" });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reservations</h1>
            <p className="text-muted-foreground">Search and manage reservations.</p>
          </div>
        </div>

        {/* ====== CARDS ====== */}
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
              <UserCheck className="h-8 w-8 text-[#1558E9]" />
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-[#1558E9]" />
            </CardContent>
          </Card>
        </div>

        {/* ====== FILTROS ====== */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[240px]">
                <Input
                  placeholder="Search by code, user, email, car, plate..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-border/50 focus:border-[#1558E9]"
                />
                <Filter className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>

              <Select value={fFilial} onValueChange={setFFilial}>
                <SelectTrigger className="w-[170px] border-border/50">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger className="w-[170px] border-border/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ====== TABELA ====== */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-foreground">Pending Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[540px] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">RESERVA ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">USER</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">E-MAIL</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">FILIAL</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">CAR</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">OUT</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">RETURN</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">STATUS</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-3 px-4 text-sm font-medium text-foreground">{r.id}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{r.user}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{r.email}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{r.filial}</td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {r.carModel} — {r.plate}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {r.outDate} • {r.outTime}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {r.returnDate} • {r.returnTime}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusChipClasses(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border/50 bg-transparent"
                            onClick={() => openView(r)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border/50 bg-transparent"
                            onClick={() => openEdit(r)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>

                          {/* Approve só quando pendente */}
                          {r.status === "Pendente" && (
                            <Button
                              size="sm"
                              className="bg-[#1558E9] hover:bg-[#1558E9]/90 text-white"
                              onClick={() => openApprove(r)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-muted-foreground text-sm">
                        Nenhuma reserva encontrada com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ====== VIEW ====== */}
        <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
          <DialogContent className="max-w-3xl bg-card border-border/50 shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Reservation dossier — {viewing?.id}
              </DialogTitle>
            </DialogHeader>

            {viewing && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">User</Label>
                    <div className="mt-1 font-medium">{viewing.user}</div>
                    <div className="text-sm text-muted-foreground">{viewing.email}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <Badge className={statusChipClasses(viewing.status)}>{viewing.status}</Badge>
                    {viewing.approvedBy && (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground ml-3">
                        <User2 className="h-4 w-4" />
                        Approved by <span className="font-medium text-foreground">{viewing.approvedBy}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Filial</Label>
                    <div className="mt-1">{viewing.filial}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Vehicle</Label>
                    <div className="mt-1">
                      {viewing.carModel} — {viewing.plate}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Saída</Label>
                    <div className="mt-1">
                      {viewing.outDate} • {viewing.outTime}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Pickup time</Label>
                    <div className="mt-1">{viewing.pickupTime ?? "—"}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Volta</Label>
                    <div className="mt-1">
                      {viewing.returnDate} • {viewing.returnTime}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" className="border-border/50 bg-transparent" onClick={() => setViewing(null)}>
                    Close
                  </Button>
                  <Button onClick={handlePrint} className="bg-[#1558E9] hover:bg-[#1558E9]/90">
                    <Printer className="h-4 w-4 mr-2" />
                    Print dossier
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ====== EDIT ====== */}
        <Dialog open={!!editing} onOpenChange={(open) => !open && cancelEdit()}>
          <DialogContent className="max-w-3xl bg-card border-border/50 shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Editar Reserva {editing?.id}
              </DialogTitle>
            </DialogHeader>

            {editDraft && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">User</Label>
                    <Input value={editDraft.user} onChange={(e) => setEditDraft({ ...editDraft, user: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">E-mail</Label>
                    <Input
                      value={editDraft.email}
                      onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Filial</Label>
                    <Select
                      value={editDraft.filial}
                      onValueChange={(v) => setEditDraft({ ...editDraft, filial: v })}
                    >
                      <SelectTrigger className="border-border/50">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Car Model</Label>
                    <Select
                      value={editDraft.carModel}
                      onValueChange={(v) =>
                        setEditDraft({
                          ...editDraft,
                          carModel: v,
                          plate: getPlateByModel(v),
                        })
                      }
                    >
                      <SelectTrigger className="border-border/50">
                        <SelectValue placeholder="Select car" />
                      </SelectTrigger>
                      <SelectContent>
                        {FLEET_MODEL_LIST.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Placa</Label>
                    <Input value={editDraft.plate} readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div>
                      <Label className="text-sm text-muted-foreground">Saída (data)</Label>
                      <Input
                        type="date"
                        value={editDraft.outDate}
                        onChange={(e) => setEditDraft({ ...editDraft, outDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Hora</Label>
                      <Input
                        type="time"
                        value={editDraft.outTime}
                        onChange={(e) => setEditDraft({ ...editDraft, outTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div>
                      <Label className="text-sm text-muted-foreground">Volta (data)</Label>
                      <Input
                        type="date"
                        value={editDraft.returnDate}
                        onChange={(e) => setEditDraft({ ...editDraft, returnDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Hora</Label>
                      <Input
                        type="time"
                        value={editDraft.returnTime}
                        onChange={(e) => setEditDraft({ ...editDraft, returnTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" className="border-border/50 bg-transparent" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                  <Button onClick={saveEdit} className="bg-[#1558E9] hover:bg-[#1558E9]/90">
                    Salvar alterações
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ====== APPROVE ====== */}
        <Dialog open={!!approving} onOpenChange={(open) => !open && setApproving(null)}>
          <DialogContent className="max-w-2xl bg-card border-border/50 shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Approve reservation
              </DialogTitle>
            </DialogHeader>

            {approving && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Confirm details and optionally assign a vehicle before approving.
                </p>

                <div className="flex items-center gap-2">
                  <span className="text-sm">Current status:</span>
                  <Badge className={statusChipClasses(approving.status)}>{approving.status}</Badge>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 grid place-items-center rounded-full bg-muted">
                    <User2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{approving.user}</div>
                    <div className="text-sm text-muted-foreground">{approving.email}</div>
                    <div className="text-sm text-muted-foreground">Filial • {approving.filial}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Trip details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">SAÍDA</Label>
                      <div className="mt-1">
                        {approving.outDate} • {approving.outTime}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">VOLTA</Label>
                      <div className="mt-1">
                        {approving.returnDate} • {approving.returnTime}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Assign vehicle</h4>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={approving.carModel}
                        onValueChange={(v) =>
                          setApproving({
                            ...approving,
                            carModel: v,
                            plate: getPlateByModel(v),
                          })
                        }
                      >
                        <SelectTrigger className="border-border/50">
                          <SelectValue placeholder="Select car" />
                        </SelectTrigger>
                        <SelectContent>
                          {FLEET_MODEL_LIST.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-muted-foreground">
                        {approving.plate ? `• ${approving.plate}` : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        className="border-border/50 bg-transparent"
                        onClick={() =>
                          setApproving({
                            ...approving,
                            pickupTime: timeMinus30(approving.outTime),
                          })
                        }
                      >
                        Pickup time
                      </Button>
                      <div className="text-sm">
                        {approving.pickupTime ? approving.pickupTime : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Optional note</Label>
                  <Input placeholder="Add an optional message for the reservation..." />
                  <p className="text-xs text-muted-foreground">
                    This note will be visible to the requester.
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button variant="outline" className="border-border/50 bg-transparent" onClick={() => setApproving(null)}>
                    Back
                  </Button>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={rejectNow}
                    >
                      Reject instead
                    </Button>
                    <Button
                      className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                      onClick={approveNow}
                    >
                      Approve reservation
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
