<<<<<<< HEAD
<<<<<<< HEAD
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusChipClasses } from "@/components/ui/status";
import { ArrowLeft, Save, X, PencilLine } from "lucide-react";
import { useBranches } from "@/hooks/use-branches";
import { useDepartments } from "@/hooks/use-departments";
import { getUser, updateUser, listUserReservations } from "@/lib/http/users";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

// se no backend o nome do campo for diferente (avatarUrl, photo...), ajuste aqui
type UserDetails = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "APPROVER" | "REQUESTER";
  status: "ACTIVE" | "INACTIVE";
  branch?: { id: string; name: string } | null;
  branchId?: string | null;
  department?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
};

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}
function formatPhoneBR(v?: string | null) {
  const d = onlyDigits(v || "");
  if (!d) return "";
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

export default function AdminUserDetailsPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { branches } = useBranches();
  const { departments } = useDepartments();

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "APPROVER" | "REQUESTER">("REQUESTER");
  const [branchId, setBranchId] = useState<string | "">("");
  const [department, setDepartment] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // reservas
  const [reservations, setReservations] = useState<any[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getUser(id);
        setUser(data);
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        setRole(data.role);
        setBranchId(data.branch?.id ?? data.branchId ?? "");
        setDepartment(data.department ?? "");
        setPhone(formatPhoneBR(data.phone ?? ""));
      } catch (e: any) {
        toast({ title: e?.response?.data?.message ?? "Erro ao carregar usuário", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, toast]);

  useEffect(() => {
    (async () => {
      setLoadingRes(true);
      try {
        const rs = await listUserReservations(id);
        setReservations(rs);
      } catch {
        // silencioso
      } finally {
        setLoadingRes(false);
      }
    })();
  }, [id]);

  const statusLabel = useMemo(
    () => (user?.status === "ACTIVE" ? "Active" : "Inactive"),
    [user?.status]
  );

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
            ? { id: updated.branchId, name: branches.find((b) => b.id === updated.branchId)?.name ?? updated.branchId }
            : null),
      });
      setEditing(false);
      toast({ title: "Dados salvos" });
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? "Erro ao salvar", variant: "destructive" });
    }
  }

  async function handleToggleStatus(next?: "ACTIVE" | "INACTIVE") {
    if (!user) return;
    try {
      const to = next ?? (user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      const updated = await updateUser(user.id, { status: to });
      setUser({ ...user, status: updated.status ?? to });
      toast({ title: `Status atualizado para ${to === "ACTIVE" ? "Active" : "Inactive"}` });
    } catch (e: any) {
      toast({ title: e?.response?.data?.message ?? "Erro ao alterar status", variant: "destructive" });
    }
  }

  if (loading || !user) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="flex gap-2">
          {!editing ? (
            <Button onClick={() => setEditing(true)}>
              <PencilLine className="h-4 w-4 mr-2" /> Editar
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} className="bg-[#1558E9] hover:bg-[#1558E9]/90">
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
          {/* Layout em duas colunas: esquerda (grid 2×N) e direita (aside fixo com foto + status) */}
          <div className="md:flex md:items-start md:gap-8">
            {/* ESQUERDA: grid de campos (não é afetada pelo tamanho da foto) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Linha 1 */}
              <div className="space-y-1">
                <Label>Full Name</Label>
                {editing ? (
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                ) : (
                  <div className="text-foreground">{user.name || "-"}</div>
                )}
              </div>

              <div className="space-y-1">
                <Label>E-mail</Label>
                {editing ? (
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                ) : (
                  <div className="text-foreground">{user.email}</div>
                )}
              </div>

              {/* Linha 2 */}
              <div className="space-y-1">
                <Label>Role</Label>
                {editing ? (
                  <Select value={role} onValueChange={(v: any) => setRole(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                      <SelectItem value="APPROVER">Approver</SelectItem>
                      <SelectItem value="REQUESTER">Requester</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-foreground">
                    {user.role === "ADMIN" ? "Administrator" : user.role === "APPROVER" ? "Approver" : "Requester"}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>Department</Label>
                {editing ? (
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.code ?? d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-foreground">{user.department ?? "-"}</div>
                )}
              </div>

              {/* Linha 3 */}
              <div className="space-y-1">
                <Label>Telephone</Label>
                {editing ? (
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                  />
                ) : (
                  <div className="text-foreground">{formatPhoneBR(user.phone) || "-"}</div>
                )}
              </div>

              <div className="space-y-1">
                <Label>Branch</Label>
                {editing ? (
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-foreground">{user.branch?.name ?? "-"}</div>
                )}
              </div>
            </div>

            {/* DIREITA: aside fixo com foto e status (não afeta a grade da esquerda) */}
            <div className="mt-8 md:mt-0 md:w-[300px] shrink-0">
              <div className="space-y-1">
                <Label>User Photo</Label>
                <div className="h-40 w-40 rounded-full overflow-hidden border mx-auto md:mx-0">
                  <img
                    src={user.photoUrl || "/images/avatar-placeholder.png"}
                    alt="User photo"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/images/avatar-placeholder.png";
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1 mt-6">
                <Label>Status</Label>
                <div className="flex items-center gap-3">
                  <Badge className={statusChipClasses(user.status === "ACTIVE" ? "Active" : "Inactive")}>
                    {user.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                  <Switch
                    checked={user.status === "ACTIVE"}
                    onCheckedChange={(checked) => handleToggleStatus(checked ? "ACTIVE" : "INACTIVE")}
                    disabled={!editing}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2: Histórico de reservas */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Reservation History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRes ? (
            <div>Carregando...</div>
          ) : reservations.length === 0 ? (
            <div className="text-muted-foreground">Sem reservas para este usuário.</div>
          ) : (
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-muted-foreground">RESERVATION ID</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">PICK-UP DATE</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">RETURN DATE</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-background">
                      <td className="py-3 px-4 text-sm">{r.code ?? r.id}</td>
                      <td className="py-3 px-4 text-sm">{r.startDate?.slice(0, 10) ?? "-"}</td>
                      <td className="py-3 px-4 text-sm">{r.endDate?.slice(0, 10) ?? "-"}</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={statusChipClasses(
                            String(r.status ?? "").toLowerCase() === "completed" ? "Active" : "Inactive"
                          )}
                        >
                          {String(r.status ?? "-")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
=======
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/http/api";

type User = {
  id: string; name: string; email: string; role: string; status: string;
  branch?: { id: string; name: string } | null;
};

=======
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/http/api";

type User = {
  id: string; name: string; email: string; role: string; status: string;
  branch?: { id: string; name: string } | null;
};

>>>>>>> origin/main
export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<User>(`/users/${id}`)
      .then(res => setUser(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !user) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Detalhes do usuário</h1>
      <div className="rounded border p-4 space-y-1">
        <div><span className="text-muted-foreground">Nome:</span> {user.name}</div>
        <div><span className="text-muted-foreground">E-mail:</span> {user.email}</div>
        <div><span className="text-muted-foreground">Papel:</span> {user.role}</div>
        <div><span className="text-muted-foreground">Status:</span> {user.status}</div>
        {user.branch && <div><span className="text-muted-foreground">Filial:</span> {user.branch.name}</div>}
      </div>
<<<<<<< HEAD
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
=======
>>>>>>> origin/main
    </div>
  );
}
