// frontend/src/pages/admin/users/details.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
import { statusChipClasses as userStatusChipClasses } from "@/components/ui/status";
import {
  ArrowLeft,
  Save,
  X,
  PencilLine,
  Eye,
  Printer,
  RotateCcw,
} from "lucide-react";
import { useBranches } from "@/hooks/use-branches";
import { useDepartments } from "@/hooks/use-departments";
import { getUser, updateUser } from "@/lib/http/users";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import type { User } from "@/lib/http/users";
import { makeFriendlyReservationCode } from "@/lib/friendly-reservation-code";
import useReservations from "@/hooks/use-reservations";
import type { Reservation } from "@/lib/http/reservations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TemporaryPasswordDialog from "@/components/modals/TemporaryPasswordDialog";
import api from "@/lib/http/api";

type UserDetails = User & {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "APPROVER" | "REQUESTER";
  status: "ACTIVE" | "INACTIVE";
  branch?: { id: string; name: string } | null;
  branchId?: string | null;
  department?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function formatPhoneBR(v?: string | null) {
  const d = onlyDigits(v || "");
  if (!d) return "";
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

/**
 * Mesmo mapeamento visual da tabela Recent Reservations do Admin Dashboard
 */
function reservationStatusChipClasses(s: string) {
  const n = s.toLowerCase();
  if (n.includes("confirm"))
    return "bg-green-100 text-green-800 border border-green-200 dark:bg-green-400/15 dark:text-green-500 dark:border-green-500/20";
  if (n.includes("pend"))
    return "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-400/15 dark:text-amber-500 dark:border-amber-500/20";
  if (n.includes("cancel"))
    return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-400/15 dark:text-red-500 dark:border-red-500/20";
  return "bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-400/15 dark:text-zinc-500 dark:border-zinc-500/20";
}

function mapReservationStatusToLabel(status: string): string {
  const s = status?.toString().toUpperCase() ?? "";

  if (s === "PENDING") return "Pendente";
  if (s === "APPROVED") return "Confirmado";
  if (s === "COMPLETED") return "Confirmado";
  if (s === "CANCELED" || s === "CANCELLED" || s === "REJECTED")
    return "Cancelado";

  return status || "—";
}

function fmtDateTime(dt?: string) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("pt-BR");
  } catch {
    return dt;
  }
}

/** Label amigável para o papel do usuário (tira o ternário aninhado do componente) */
function getUserRoleLabel(role: UserDetails["role"]): string {
  if (role === "ADMIN") return "Administrator";
  if (role === "APPROVER") return "Approver";
  return "Requester";
}

/** Label amigável para status do usuário (e reaproveitado no chip) */
function getUserStatusLabel(status: UserDetails["status"]): "Active" | "Inactive" {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

/** Monta a string de veículo para o modal, isolando condicionais do componente principal */
function formatReservationVehicle(reservation: Reservation): string {
  const car = (reservation as any).car;
  if (!car) return "—";

  const plate = car.plate ?? "";
  const model = car.model ?? "";

  if (plate && model) {
    return `${plate} — ${model}`;
  }

  return plate || model || "—";
}

export default function AdminUserDetailsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { branches } = useBranches();
  const { departments } = useDepartments();

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [editing, setEditing] = useState(false);

  // form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "APPROVER" | "REQUESTER">(
    "REQUESTER",
  );
  const [branchId, setBranchId] = useState<string | "">("");
  const [department, setDepartment] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // reservas (mesmo hook do dashboard)
  const {
    items: allReservations,
    loading,
    errors,
    refresh,
  } = useReservations();

  // dispara o carregamento das reservas (igual dashboard) – sem usar `void`
  useEffect(() => {
    refresh().catch(() => {
      // erros já são expostos via `errors.list`
    });
  }, [refresh]);

  const reservations: Reservation[] = useMemo(
    () =>
      (allReservations ?? []).filter((r: any) => {
        const requesterId =
          (r as any).requesterId ??
          (r as any).userId ??
          (r as any).user?.id ??
          null;
        return requesterId === id;
      }) as Reservation[],
    [allReservations, id],
  );

  // estado para o modal de detalhes
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  // estados para reset de senha
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [temporaryPasswordDialogOpen, setTemporaryPasswordDialogOpen] =
    useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  function openDetails(r: Reservation) {
    setSelectedReservation(r);
    setDetailsOpen(true);
  }

  // Carrega usuário
  useEffect(() => {
    (async () => {
      try {
        const data = await getUser(id);
        setUser(data as UserDetails);
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        setRole(data.role);
        setBranchId(data.branch?.id ?? data.branchId ?? "");
        setDepartment(data.department ?? "");
        setPhone(formatPhoneBR(data.phone ?? ""));
      } catch (e: any) {
        toast({
          title: e?.response?.data?.message ?? "Erro ao carregar usuário",
          variant: "destructive",
        });
      } finally {
        setLoadingUser(false);
      }
    })();
  }, [id, toast]);

  async function handleSave() {
    if (!user) return;
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        branchId: branchId || null,
        department: department || null,
        phone: onlyDigits(phone) || null,
      };
      const updated = await updateUser(user.id, payload);
      setUser({
        ...user,
        ...updated,
        branch:
          updated.branch ??
          (updated.branchId
            ? {
                id: updated.branchId,
                name:
                  branches.find((b) => b.id === updated.branchId)?.name ??
                  updated.branchId,
              }
            : null),
      });
      setEditing(false);
      toast({ title: "Dados salvos" });
    } catch (e: any) {
      toast({
        title: e?.response?.data?.message ?? "Erro ao salvar",
        variant: "destructive",
      });
    }
  }

  async function handleToggleStatus(next?: "ACTIVE" | "INACTIVE") {
    if (!user) return;
    try {
      const to = next ?? (user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      const updated = await updateUser(user.id, { status: to });
      setUser({ ...user, status: updated.status ?? to });
      toast({
        title: `Status atualizado para ${to === "ACTIVE" ? "Active" : "Inactive"}`,
      });
    } catch (e: any) {
      toast({
        title: e?.response?.data?.message ?? "Erro ao alterar status",
        variant: "destructive",
      });
    }
  }

  async function handleConfirmResetPassword() {
    if (!user) return;

    try {
      setResettingPassword(true);

      const { data } = await api.post(`/users/${user.id}/reset-password`, {});
      const tmp =
        (data as any).temporaryPassword ??
        (data as any).password ??
        (typeof data === "string" ? data : "");

      if (!tmp) {
        throw new Error("Resposta da API não contém senha temporária.");
      }

      setTemporaryPassword(tmp);
      setResetConfirmOpen(false);
      setTemporaryPasswordDialogOpen(true);
    } catch (e: any) {
      toast({
        title:
          e?.response?.data?.message ??
          "Erro ao resetar a senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
    }
  }

  if (loadingUser || !user) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <p>Carregando...</p>
      </div>
    );
  }

  const userStatusLabel = getUserStatusLabel(user.status);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetConfirmOpen(true)}
              disabled={resettingPassword}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset password
            </Button>

            {!editing ? (
              <Button onClick={() => setEditing(true)}>
                <PencilLine className="h-4 w-4 mr-2" /> Editar
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                >
                  <Save className="h-4 w-4 mr-2" /> Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setName(user.name ?? "");
                    setEmail(user.email ?? "");
                    setRole(user.role);
                    setBranchId(user.branch?.id ?? user.branchId ?? "");
                    setDepartment(user.department ?? "");
                    setPhone(formatPhoneBR(user.phone ?? ""));
                  }}
                >
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bloco 1: Informações pessoais */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="md:flex md:items-start md:gap-8">
              {/* ESQUERDA */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  {editing ? (
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  ) : (
                    <div className="text-foreground">{user.name || "-"}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>E-mail</Label>
                  {editing ? (
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  ) : (
                    <div className="text-foreground">{user.email}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Role</Label>
                  {editing ? (
                    <Select value={role} onValueChange={(v: any) => setRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrator</SelectItem>
                        <SelectItem value="APPROVER">Approver</SelectItem>
                        <SelectItem value="REQUESTER">Requester</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-foreground">
                      {getUserRoleLabel(user.role)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Department</Label>
                  {editing ? (
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.code ?? d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-foreground">
                      {user.department ?? "-"}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Telephone</Label>
                  {editing ? (
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                    />
                  ) : (
                    <div className="text-foreground">
                      {formatPhoneBR(user.phone) || "-"}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Branch</Label>
                  {editing ? (
                    <Select value={branchId} onValueChange={setBranchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-foreground">
                      {user.branch?.name ?? "-"}
                    </div>
                  )}
                </div>
              </div>

              {/* DIREITA: apenas status (sem foto/avatar) */}
              <div className="mt-8 md:mt-0 md:w-[300px] shrink-0">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={userStatusChipClasses(userStatusLabel)}
                    >
                      {userStatusLabel}
                    </Badge>
                    <Switch
                      checked={user.status === "ACTIVE"}
                      onCheckedChange={(checked) =>
                        handleToggleStatus(checked ? "ACTIVE" : "INACTIVE")
                      }
                      disabled={!editing}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 2: Histórico de reservas — layout igual ao dashboard, com botão Details abrindo modal */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Reservation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-w-full rounded-md border border-border/50">
              <div className="overflow-x-auto">
                <div className="max-h-80 overscroll-contain overflow-y-auto">
                  {loading.list ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      Carregando reservas…
                    </div>
                  ) : reservations.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      Sem reservas para este usuário.
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
                            PICK-UP DATE
                          </th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                            RETURN DATE
                          </th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                            STATUS
                          </th>
                          <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map((r) => {
                          const label = mapReservationStatusToLabel(
                            String((r as any).status ?? ""),
                          );

                          return (
                            <tr
                              key={r.id}
                              className="border-b border-border/50 hover:bg-card/50"
                            >
                              <td className="py-3 px-4 text-sm font-medium text-foreground">
                                {makeFriendlyReservationCode(
                                  (r as any).code ?? r.id,
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-foreground">
                                {(r as any).car?.model ?? "—"}
                              </td>
                              <td className="py-3 px-4 text-sm text-foreground">
                                {fmtDateTime((r as any).startAt)}
                              </td>
                              <td className="py-3 px-4 text-sm text-foreground">
                                {fmtDateTime((r as any).endAt)}
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  className={reservationStatusChipClasses(
                                    label,
                                  )}
                                >
                                  {label}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDetails(r)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {errors?.list && !loading.list && (
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

      {/* Dialog de detalhes da reserva — mesmo comportamento visual do popup */}
      <Dialog
        open={detailsOpen && !!selectedReservation}
        onOpenChange={setDetailsOpen}
      >
        {selectedReservation && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Reservation — {selectedReservation.id}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    User
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {(selectedReservation as any).user?.name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedReservation as any).user?.email ?? ""}
                  </p>
                </div>

                <div className="flex md:justify-end">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Status
                    </p>
                    <Badge
                      className={reservationStatusChipClasses(
                        mapReservationStatusToLabel(
                          String((selectedReservation as any).status ?? ""),
                        ),
                      )}
                    >
                      {mapReservationStatusToLabel(
                        String((selectedReservation as any).status ?? ""),
                      )}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Branch
                  </p>
                  <p className="text-sm text-foreground">
                    {(selectedReservation as any).branch?.name ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Vehicle
                  </p>
                  <p className="text-sm text-foreground">
                    {formatReservationVehicle(selectedReservation)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Origin
                  </p>
                  <p className="text-sm text-foreground">
                    {(selectedReservation as any).origin ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Destination
                  </p>
                  <p className="text-sm text-foreground">
                    {(selectedReservation as any).destination ?? "—"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Period
                  </p>
                  <p className="text-sm text-foreground">
                    {fmtDateTime((selectedReservation as any).startAt)} →{" "}
                    {fmtDateTime((selectedReservation as any).endAt)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDetailsOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Dialog de confirmação de reset de senha */}
      <Dialog
        open={resetConfirmOpen}
        onOpenChange={(open) => {
          if (!resettingPassword) setResetConfirmOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Resetar senha do usuário
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Tem certeza que deseja resetar a senha de{" "}
            <b>{user.email}</b>? Uma nova senha temporária será gerada e o
            usuário será obrigado a trocá-la no próximo acesso.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setResetConfirmOpen(false)}
              disabled={resettingPassword}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#1558E9] hover:bg-[#1558E9]/90"
              onClick={handleConfirmResetPassword}
              disabled={resettingPassword}
            >
              {resettingPassword ? "Resetando…" : "Resetar senha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog com a senha temporária (mesmo estilo do sistema) */}
      <TemporaryPasswordDialog
        open={temporaryPasswordDialogOpen}
        onOpenChange={setTemporaryPasswordDialogOpen}
        email={user.email}
        password={temporaryPassword}
      />
    </>
  );
}
