import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Search, Edit } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { statusChipClasses } from "@/components/ui/status";

const BRANCHES = ["JLLE", "CWB", "MGA", "POA", "SP", "RJ", "CXS", "RBP"] as const;
const DEPARTMENTS = ["IT", "ADM", "HR", "TAX"] as const;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "Administrator" | "Approver" | "Requester";
  department: string;
  filial: string;
  status: "Active" | "Inactive";
};

const getUsersFromLocalStorage = (): UserRow[] | null => {
  if (typeof window === "undefined") return null;
  const usersJson = localStorage.getItem("users");
  try {
    return usersJson ? (JSON.parse(usersJson) as UserRow[]) : null;
  } catch {
    return null;
  }
};

const saveUsersToLocalStorage = (users: UserRow[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("users", JSON.stringify(users));
};

const roleLabelFromCode = (code: string): UserRow["role"] => {
  switch (code) {
    case "ADMIN":
      return "Administrator";
    case "APPROVER":
      return "Approver";
    case "REQUESTER":
      return "Requester";
    default:
      return (code as UserRow["role"]) || "Requester";
  }
};

const initialUsers: UserRow[] = [
  { id: "1", name: "Alex Morgan", email: "alex.morgan@reservcar.com", role: "Administrator", department: "IT",  filial: "JLLE", status: "Active" },
  { id: "2", name: "Alex Morgan", email: "alex.morgan@reservcar.com", role: "Approver",      department: "ADM", filial: "CWB",  status: "Active" },
  { id: "3", name: "Alex Morgan", email: "alex.morgan@reservcar.com", role: "Approver",      department: "ADM", filial: "MGA",  status: "Active" },
  { id: "4", name: "Alex Morgan", email: "alex.morgan@reservcar.com", role: "Requester",     department: "HR",  filial: "POA",  status: "Active" },
  { id: "5", name: "Alex Morgan", email: "alex.morgan@reservcar.com", role: "Requester",     department: "TAX", filial: "JLLE", status: "Active" },
];

export default function AdminUsersPage() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "approver" | "requester">("all");
  const [filterDept, setFilterDept] = useState<"all" | "it" | "adm" | "hr" | "tax">("all");
  const [filterFilial, setFilterFilial] = useState<"all" | (typeof BRANCHES)[number]>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    unit: "",        
    department: "",
    role: "",        // ADMIN | APPROVER | REQUESTER
    phone: "",
  });

  const [users, setUsers] = useState<UserRow[]>(() => {
    const stored = getUsersFromLocalStorage();
    return stored ?? initialUsers;
  });

  useEffect(() => {
    saveUsersToLocalStorage(users);
  }, [users]);

  const stats = [
    { title: "Total Users", value: String(users.length), icon: Users, isHighlighted: false },
    { title: "Active This Month", value: "45", icon: Users, isHighlighted: true },
    { title: "Approvers", value: String(users.filter(u => u.role === "Approver").length), icon: Users, isHighlighted: false },
    { title: "Administrator", value: String(users.filter(u => u.role === "Administrator").length), icon: Users, isHighlighted: false },
  ];

  function handleNewUser() {
    const nextId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(users.reduce((max, u) => Math.max(max, Number.parseInt(u.id, 10) || 0), 0) + 1);

    const newUser: UserRow = {
      id: nextId,
      name: newUserData.name.trim(),
      email: newUserData.email.trim(),
      role: roleLabelFromCode(newUserData.role),
      department: newUserData.department.trim(),
      filial: newUserData.unit.trim(),
      status: "Active",
    };

    setUsers((prev) => [...prev, newUser]);
    setShowNewUserModal(false);
    setNewUserData({ name: "", email: "", unit: "", department: "", role: "", phone: "" });
  }

  function handleUserClick(userId: string) {
    navigate(`/admin/users/${userId}`);
  }

  const filteredUsers = users
    .filter((u) =>
      !searchTerm
        ? true
        : u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((u) => {
      if (filterRole === "all") return true;
      if (filterRole === "admin") return u.role === "Administrator";
      if (filterRole === "approver") return u.role === "Approver";
      return u.role === "Requester";
    })
    .filter((u) => (filterDept === "all" ? true : u.department.toLowerCase() === filterDept))
    .filter((u) => (filterFilial === "all" ? true : u.filial === filterFilial))
    .filter((u) => {
      if (filterStatus === "all") return true;
      return u.status.toLowerCase() === filterStatus;
    });

  return (
    <RoleGuard allowedRoles={["ADMIN"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users Management</h1>
            <p className="text-muted-foreground">Manage users and their roles.</p>
          </div>
          <Button className="bg-[#1558E9] hover:bg-[#1558E9]/90 shadow-sm" onClick={() => setShowNewUserModal(true)}>
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
                    <p className={`text-sm font-medium ${stat.isHighlighted ? "text-white/80" : "text-muted-foreground"}`}>
                      {stat.title}
                    </p>
                    <p className={`text-2xl font-bold ${stat.isHighlighted ? "text-white" : "text-foreground"}`}>
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.isHighlighted ? "text-white/80" : "text-[#1558E9]"}`} />
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

              <Select value={filterRole} onValueChange={(v: any) => setFilterRole(v)}>
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

              <Select value={filterDept} onValueChange={(v: any) => setFilterDept(v)}>
                <SelectTrigger className="w-[150px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterFilial} onValueChange={(v: any) => setFilterFilial(v)}>
                <SelectTrigger className="w-[150px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Filials</SelectItem>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger className="w-[150px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">USER</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">E-MAIL</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">ROLE</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">DEPARTMENT</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">FILIAL</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">STATUS</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/50 hover:bg-background cursor-pointer transition-colors"
                      onClick={() => handleUserClick(user.id)}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-foreground">{user.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{user.email}</td>
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
                      <td className="py-3 px-4 text-sm text-gray-700">{user.department}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{user.filial}</td>
                      <td className="py-3 px-4">
                        <Badge className={statusChipClasses(user.status)}>{user.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-card/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserClick(user.id);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal: New User */}
        <Dialog open={showNewUserModal} onOpenChange={setShowNewUserModal}>
          <DialogContent className="sm:max-w-md bg-card border-border/50 shadow-lg">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-foreground">New User</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                <Input
                  id="name"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 border-border/50 focus:border-[#1558E9]"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1 border-border/50 focus:border-[#1558E9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Branch</Label>
                  <Select
                    value={newUserData.unit}
                    onValueChange={(v) => setNewUserData((p) => ({ ...p, unit: v }))}
                  >
                    <SelectTrigger className="mt-1 border-border/50 focus:border-[#1558E9]">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="department" className="text-sm font-medium text-gray-700">Department</Label>
                  <Select
                    value={newUserData.department}
                    onValueChange={(v) => setNewUserData((p) => ({ ...p, department: v }))}
                  >
                    <SelectTrigger className="mt-1 border-border/50 focus:border-[#1558E9]">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role" className="text-sm font-medium text-gray-700">Role</Label>
                  <Select value={newUserData.role} onValueChange={(v) => setNewUserData((p) => ({ ...p, role: v }))}>
                    <SelectTrigger className="mt-1 border-border/50 focus:border-[#1558E9]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                      <SelectItem value="APPROVER">Approver</SelectItem>
                      <SelectItem value="REQUESTER">Requester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Telephone</Label>
                  <Input
                    id="phone"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData((p) => ({ ...p, phone: e.target.value }))}
                    className="mt-1 border-border/50 focus:border-[#1558E9]"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setShowNewUserModal(false)} className="border-border/50">
                  Back
                </Button>
                <Button onClick={handleNewUser} className="bg-[#1558E9] hover:bg-[#1558E9]/90">
                  Salvar Usuario
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
