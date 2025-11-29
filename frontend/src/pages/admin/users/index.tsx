import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Search, Edit, Trash2 } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { statusChipClasses } from "@/components/ui/status";
import BranchName from "@/components/ui/branch-name";
import { useToast } from "@/components/ui/use-toast";

import TemporaryPasswordDialog from "@/components/modals/TemporaryPasswordDialog";
import { useBranches } from "@/hooks/use-branches";
import { api } from "@/lib/http/api";
import {
  listUsers,
  createUser,
  deleteUser,
  type User as ApiUser,
  type UserRole,
  type CreatedUserResponse,
} from "@/lib/http/users";

/** Tipos auxiliares */
type AnyApiUser = ApiUser & {
  createdAt?: string;
  department?: string | null;
  branchId?: string | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "Administrator" | "Approver" | "Requester";
  department: string;
  branchId?: string | null;
  status: "Active" | "Inactive";
  createdAt?: string;
};

type Department = { id: string; name: string; code?: string | null };

const roleLabelFromCode = (code: UserRole): UserRow["role"] => {
  switch (code) {
    case "ADMIN":
      return "Administrator";
    case "APPROVER":
      return "Approver";
    default:
      return "Requester";
  }
};

const statusLabelFromCode = (s: ApiUser["status"]): UserRow["status"] =>
  s === "ACTIVE" ? "Active" : "Inactive";

const apiUserToRow = (u: AnyApiUser): UserRow => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: roleLabelFromCode(u.role as UserRole),
  department: (u as AnyApiUser).department ?? "",
  branchId: (u as AnyApiUser).branchId ?? null,
  status: statusLabelFromCode(u.status),
  createdAt: (u as AnyApiUser).createdAt,
});

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Filiais dinâmicas (para modal + filtro)
  const {
    branches,
    loading: loadingBranches,
    error: branchesError,
  } = useBranches();

  // Departamentos dinâmicos do banco
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [deptsError, setDeptsError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<
    "all" | "admin" | "approver" | "requester"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [filterBranchId, setFilterBranchId] = useState<"all" | string>("all");

  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    branchId: "",
    department: "",
    role: "" as "" | UserRole,
    phone: "", // apenas dígitos, enviado ao backend
  });
  const [phoneMasked, setPhoneMasked] = useState("");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Delete (dialogo de confirmação)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dialog de senha temporária
  const [tempOpen, setTempOpen] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  // Carrega departamentos do banco
  useEffect(() => {
    let cancelled = false;
    async function loadDepts() {
      try {
        setLoadingDepts(true);
        setDeptsError(null);
        const res = await api.get<Department[]>("/departments");
        if (!cancelled) setDepartments(res.data ?? []);
      } catch (e: any) {
        if (!cancelled)
          setDeptsError(
            e?.response?.data?.message ||
              e?.message ||
              "Erro ao carregar departamentos.",
          );
      } finally {
        if (!cancelled) setLoadingDepts(false);
      }
    }
    loadDepts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Lista usuários
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await listUsers({
        q: searchTerm || undefined,
        branchId: filterBranchId !== "all" ? filterBranchId : undefined,
      });
      setUsers((data as AnyApiUser[]).map(apiUserToRow));
    } catch (e: any) {
      toast({ title: "Erro ao listar usuários", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);
  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [searchTerm, filterBranchId]);

  // Métricas
  const firstOfMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const activeThisMonth = useMemo(() => {
    return users.filter((u) => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d >= firstOfMonth;
    }).length;
  }, [users, firstOfMonth]);

  const stats = useMemo(
    () => [
      {
        title: "Total Users",
        value: String(users.length),
        icon: Users,
        isHighlighted: false,
      },
      {
        title: "Active This Month",
        value: String(activeThisMonth),
        icon: Users,
        isHighlighted: true,
      },
      {
        title: "Approvers",
        value: String(users.filter((u) => u.role === "Approver").length),
        icon: Users,
        isHighlighted: false,
      },
      {
        title: "Administrator",
        value: String(users.filter((u) => u.role === "Administrator").length),
        icon: Users,
        isHighlighted: false,
      },
    ],
    [users, activeThisMonth],
  );

  async function handleNewUser() {
    try {
      if (!newUserData.name.trim() || !newUserData.email.trim()) {
        toast({
          title: "Nome e e-mail são obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      const created = await createUser({
        name: newUserData.name.trim(),
        email: newUserData.email.trim(),
        branchId: newUserData.branchId || undefined,
        // Mandamos o "code" do departamento
        department: newUserData.department || undefined,
        role: (newUserData.role || "REQUESTER") as UserRole,
        phone: newUserData.phone || undefined,
      } as any);

      setShowNewUserModal(false);
      setNewUserData({
        name: "",
        email: "",
        branchId: "",
        department: "",
        role: "",
        phone: "",
      });
      setPhoneMasked("");
      await fetchUsers();

      const temp = (created as CreatedUserResponse).temporaryPassword;
      if (temp) {
        setTempEmail(created.email);
        setTempPassword(temp);
        setTempOpen(true);
      } else {
        toast({ title: "Usuário criado com sucesso!" });
      }
    } catch (e: any) {
      const isConflict = e?.response?.status === 409;
      toast({
        title: isConflict ? "E-mail já cadastrado." : "Erro ao criar usuário.",
        variant: "destructive",
      });
    }
  }

  function handleUserClick(userId: string) {
    navigate(`/admin/users/${userId}`);
  }

  function askDelete(e: React.MouseEvent, user: { id: string; name: string }) {
    e.stopPropagation();
    setTargetUser(user);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!targetUser) return;
    try {
      setDeletingId(targetUser.id);
      await deleteUser(targetUser.id);
      setConfirmOpen(false);
      setTargetUser(null);
      await fetchUsers();
      toast({ title: "Usuário removido" });
    } catch (e: any) {
      toast({
        title: e?.response?.data?.message ?? "Erro ao remover usuário.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  const filteredUsers = users
    .filter((u) =>
      !searchTerm
        ? true
        : u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .filter((u) => {
      if (filterRole === "all") return true;
      if (filterRole === "admin") return u.role === "Administrator";
      if (filterRole === "approver") return u.role === "Approver";
      return u.role === "Requester";
    })
    .filter((u) => {
      if (filterStatus === "all") return true;
      return u.status.toLowerCase() === filterStatus;
    })
    .filter((u) =>
      filterBranchId === "all" ? true : u.branchId === filterBranchId,
    );

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Users Management
            </h1>
            <p className="text-muted-foreground">
              Manage users and their roles.
            </p>
          </div>
          <Button
            className="bg-[#1558E9] hover:bg-[#1558E9]/90 shadow-sm"
            onClick={() => setShowNewUserModal(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            New User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className={`border-border/50 shadow-sm ${stat.isHighlighted ? "bg-[#1558E9] text-white" : ""}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm font-medium ${stat.isHighlighted ? "text-white/80" : "text-muted-foreground"}`}
                    >
                      {stat.title}
                    </p>
                    <p
                      className={`text-2xl font-bold ${stat.isHighlighted ? "text-white" : "text-foreground"}`}
                    >
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon
                    className={`h-8 w-8 ${stat.isHighlighted ? "text-white/80" : "text-[#1558E9]"}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-border/50 focus:border-[#1558E9] shadow-sm"
                  />
                </div>
              </div>

              <Select
                value={filterRole}
                onValueChange={(v: any) => setFilterRole(v)}
              >
                <SelectTrigger className="w-[150px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="approver">Approver</SelectItem>
                  <SelectItem value="requester">Requester</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterStatus}
                onValueChange={(v: any) => setFilterStatus(v)}
              >
                <SelectTrigger className="w-[150px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterBranchId}
                onValueChange={(v: any) => setFilterBranchId(v)}
              >
                <SelectTrigger className="w-[180px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[1100]">
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">
              {loading ? "Carregando..." : "Users"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      USER
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      E-MAIL
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      ROLE
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      DEPARTMENT
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      FILIAL
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      STATUS
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/50 hover:bg-background cursor-pointer transition-colors"
                      onClick={() => handleUserClick(user.id)}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        {user.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            user.role === "Administrator"
                              ? "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-400/15 dark:text-orange-500 dark:border-orange-500/20"
                              : user.role === "Approver"
                                ? "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-400/15 dark:text-blue-500 dark:border-blue-500/20"
                                : "bg-pink-100 text-pink-800 border border-pink-200 dark:bg-pink-400/15 dark:text-pink-500 dark:border-pink-500/20"
                          }
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {user.department || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        <BranchName id={user.branchId ?? undefined} />
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusChipClasses(user.status)}>
                          {user.status}
                        </Badge>
                      </td>
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-card/50"
                            onClick={() => handleUserClick(user.id)}
                            title="Ver / Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {/*
                            Botão de remoção desativado para manter histórico
                            de usuários em produção (decisão de negócio do TCC).
                            Para reativar no futuro, basta remover este bloco
                            de comentário.

                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-card/50 text-red-600"
                            onClick={(e) =>
                              askDelete(e, { id: user.id, name: user.name })
                            }
                            disabled={deletingId === user.id}
                            title={
                              deletingId === user.id
                                ? "Removendo..."
                                : "Remover usuário"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          */}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredUsers.length === 0 && (
                    <tr>
                      <td
                        className="py-6 text-center text-muted-foreground"
                        colSpan={7}
                      >
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal: New User */}
        <Dialog
          open={showNewUserModal}
          onOpenChange={(o) => {
            setShowNewUserModal(o);
            if (!o) setPhoneMasked("");
          }}
        >
          <DialogContent className="sm:max-w-md bg-card border-border/50 shadow-lg z-[1000]">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-foreground">
                New User
              </DialogTitle>
            </DialogHeader>

            {branchesError && (
              <div className="text-sm text-red-500">
                Erro ao carregar filiais: {branchesError}
              </div>
            )}
            {deptsError && (
              <div className="text-sm text-red-500">
                Erro ao carregar departamentos: {deptsError}
              </div>
            )}

            <div className="space-y-4 pt-4">
              <div>
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700"
                >
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={newUserData.name}
                  onChange={(e) =>
                    setNewUserData((p) => ({ ...p, name: e.target.value }))
                  }
                  className="mt-1 border-border/50 focus:border-[#1558E9]"
                />
              </div>

              <div>
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) =>
                    setNewUserData((p) => ({ ...p, email: e.target.value }))
                  }
                  className="mt-1 border-border/50 focus:border-[#1558E9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* BRANCH (dinâmico) */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Branch
                  </Label>
                  <Select
                    value={newUserData.branchId}
                    onValueChange={(v) =>
                      setNewUserData((p) => ({ ...p, branchId: v }))
                    }
                    disabled={loadingBranches || (branches?.length ?? 0) === 0}
                  >
                    <SelectTrigger className="mt-1 border-border/50 focus:border-[#1558E9]">
                      <SelectValue
                        placeholder={
                          loadingBranches ? "Loading..." : "Select branch"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[1100]">
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* DEPARTMENT (dinâmico do banco, usando code) */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Department
                  </Label>
                  <Select
                    value={newUserData.department}
                    onValueChange={(v) =>
                      setNewUserData((p) => ({ ...p, department: v }))
                    }
                    disabled={loadingDepts || (departments?.length ?? 0) === 0}
                  >
                    <SelectTrigger className="mt-1 border-border/50 focus:border-[#1558E9]">
                      <SelectValue
                        placeholder={
                          loadingDepts ? "Loading..." : "Select department"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[1100]">
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.code ?? ""}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Role
                  </Label>
                  <Select
                    value={newUserData.role}
                    onValueChange={(v: UserRole) =>
                      setNewUserData((p) => ({ ...p, role: v }))
                    }
                  >
                    <SelectTrigger className="mt-1 border-border/50 focus:border-[#1558E9]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[1100]">
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                      <SelectItem value="APPROVER">Approver</SelectItem>
                      <SelectItem value="REQUESTER">Requester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* TELEFONE COM MÁSCARA (BR) */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Telephone
                  </Label>
                  <Input
                    inputMode="numeric"
                    maxLength={16}
                    value={phoneMasked}
                    onChange={(e) => {
                      const digits = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 11);
                      let masked = "";
                      const d = digits;
                      if (d.length <= 2) masked = `(${d}`;
                      else if (d.length <= 6)
                        masked = `(${d.slice(0, 2)}) ${d.slice(2)}`;
                      else if (d.length <= 10)
                        masked = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(
                          6,
                        )}`;
                      else
                        masked = `(${d.slice(0, 2)}) ${d.slice(
                          2,
                          7,
                        )}-${d.slice(7)}`;

                      setPhoneMasked(masked);
                      setNewUserData((p) => ({ ...p, phone: digits }));
                    }}
                    placeholder="(11) 98765-4321"
                    className="mt-1 border-border/50 focus:border-[#1558E9]"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aceita 10 ou 11 dígitos com DDD.
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowNewUserModal(false)}
                  className="border-border/50"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNewUser}
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                >
                  Salvar Usuario
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmar remoção */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border/50 shadow-lg z-[1000]">
            <DialogHeader>
              <DialogTitle>Remover usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja remover{" "}
                <span className="font-medium text-foreground">
                  {targetUser?.name}
                </span>
                ? Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={!!deletingId}
                >
                  {deletingId ? "Removendo..." : "Remover"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de senha temporária */}
        <TemporaryPasswordDialog
          open={tempOpen}
          onOpenChange={setTempOpen}
          email={tempEmail}
          password={tempPassword}
        />
      </div>
    </RoleGuard>
  );
}
