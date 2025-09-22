import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, X, Edit } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { statusChipClasses } from "@/components/ui/status";

const BRANCHES = ["JLLE", "CWB", "MGA", "POA", "SP", "RJ", "CXS", "RBP"] as const;
type Permission = "ADMIN" | "APPROVER" | "REQUESTER";

type UserData = {
  id: string;
  name: string;
  email: string;
  unit: string;         
  department: string;
  phone: string;
  status: boolean;      
  permission: Permission;
  filial: string;
};

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: "Administrator" | "Approver" | "Requester";
  department: string;
  filial: string;
  status: "Active" | "Inactive";
};

function toPermission(role: StoredUser["role"]): Permission {
  if (role === "Administrator") return "ADMIN";
  if (role === "Approver") return "APPROVER";
  return "REQUESTER";
}

function toRole(permission: Permission): StoredUser["role"] {
  if (permission === "ADMIN") return "Administrator";
  if (permission === "APPROVER") return "Approver";
  return "Requester";
}

function mapStoredToDetail(u: StoredUser): UserData {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    unit: u.filial,
    department: u.department,
    phone: "",
    status: u.status === "Active",
    permission: toPermission(u.role),
    filial: u.filial,
  };
}

function mapDetailToStored(u: UserData): StoredUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: toRole(u.permission),
    department: u.department,
    filial: u.unit || u.filial,
    status: u.status ? "Active" : "Inactive",
  };
}

export default function AdminUserDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [userData, setUserData] = useState<UserData>({
    id: "",
    name: "",
    email: "",
    unit: "",
    department: "",
    phone: "",
    status: true,
    permission: "REQUESTER",
    filial: ""
  });

  const [reservationHistory, setReservationHistory] = useState<
    { id: string; carModel: string; pickupDate: string; returnDate: string; status: string }[]
  >([]);

  useEffect(() => {
    if (!id) return;

    const storedUsers = localStorage.getItem("users");
    if (storedUsers) {
      const users: StoredUser[] = JSON.parse(storedUsers);
      const found = users.find((u) => u.id === id);
      if (found) {
        setUserData(mapStoredToDetail(found));
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    } else {
      setNotFound(true);
    }

    setReservationHistory([
      { id: "R2023001", carModel: "Honda Civic", pickupDate: "2023-10-20", returnDate: "2023-10-21", status: "Aprovado" },
      { id: "R2023002", carModel: "Toyota Corolla", pickupDate: "2023-10-22", returnDate: "2023-10-23", status: "Rejeitado" },
      { id: "R2023003", carModel: "Ford Focus", pickupDate: "2023-10-24", returnDate: "2023-10-24", status: "Aprovado" },
    ]);
  }, [id]);

  const handleSave = () => {
    const storedUsers = localStorage.getItem("users");
    if (storedUsers) {
      const users: StoredUser[] = JSON.parse(storedUsers);
      const updated = users.map((u) => (u.id === userData.id ? mapDetailToStored(userData) : u));
      localStorage.setItem("users", JSON.stringify(updated));
    }
    setIsEditing(false);
    navigate("/admin/users");
  };

  const handleCancel = () => {
    if (!id) return;
    const storedUsers = localStorage.getItem("users");
    if (storedUsers) {
      const users: StoredUser[] = JSON.parse(storedUsers);
      const found = users.find((u) => u.id === id);
      if (found) setUserData(mapStoredToDetail(found));
    }
    setIsEditing(false);
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]} requireAuth={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/users">
              <Button variant="ghost" size="sm" className="hover:bg-card/50">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Profile</h1>
            </div>
          </div>
        </div>

        {notFound ? (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <p className="text-muted-foreground">Usuário não encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#1558E9] text-lg font-semibold">Personal Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:items-center">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Name</Label>
                    {isEditing ? (
                      <Input
                        value={userData.name}
                        onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                        className="mt-1 border-border/50 focus:border-[#1558E9]"
                      />
                    ) : (
                      <span className="text-foreground">{userData.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:justify-start">
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <Switch
                      checked={!!userData.status}
                      onCheckedChange={(checked) => setUserData({ ...userData, status: checked })}
                      disabled={!isEditing}
                    />
                    <Badge className={statusChipClasses(userData.status ? "Active" : "Inactive")}>
                      {userData.status ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">E-mail Corporativo</Label>
                    {isEditing ? (
                      <Input
                        value={userData.email}
                        onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                        className="mt-1 border-border/50 focus:border-[#1558E9]"
                      />
                    ) : (
                      <span className="text-foreground block">{userData.email}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Permissão no Sistema</Label>
                    {isEditing ? (
                      <Select
                        value={userData.permission}
                        onValueChange={(value: Permission) => setUserData({ ...userData, permission: value })}
                      >
                        <SelectTrigger className="border-border/50 focus:border-[#1558E9]">
                          <SelectValue placeholder="Select permission" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrator</SelectItem>
                          <SelectItem value="APPROVER">Approver</SelectItem>
                          <SelectItem value="REQUESTER">Requester</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="border-border/50 text-gray-700 bg-card/50">
                        {userData.permission}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Unidade</Label>
                    {isEditing ? (
                      <Select
                        value={userData.unit}
                        onValueChange={(v) => setUserData({ ...userData, unit: v })}
                      >
                        <SelectTrigger className="border-border/50 focus:border-[#1558E9]">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {BRANCHES.map((b) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-foreground block">{userData.unit}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Departamento</Label>
                    {isEditing ? (
                      <Input
                        value={userData.department}
                        onChange={(e) => setUserData({ ...userData, department: e.target.value })}
                        className="mt-1 border-border/50 focus:border-[#1558E9]"
                      />
                    ) : (
                      <span className="text-foreground block">{userData.department}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Telefone</Label>
                    {isEditing ? (
                      <Input
                        value={userData.phone}
                        onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                        className="mt-1 border-border/50 focus:border-[#1558E9]"
                      />
                    ) : (
                      <span className="text-foreground block">{userData.phone}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[#1558E9] text-lg font-semibold">Histórico de Reservas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">RESERVATION ID</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">CAR MODEL</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">PICK-UP DATE</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">RETURN DATE</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservationHistory.map((r) => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="py-3 px-4 text-sm text-gray-700">{r.id}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{r.carModel}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{r.pickupDate}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{r.returnDate}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel} className="border-border/50 bg-transparent">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} className="bg-[#1558E9] hover:bg-[#1558E9]/90">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="border-border/50 bg-transparent"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
