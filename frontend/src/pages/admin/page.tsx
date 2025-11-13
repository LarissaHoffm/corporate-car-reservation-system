import * as React from "react";
import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Car, Calendar, FileCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const stats = [
    {
      title: "Total Fleet",
      value: "250",
      icon: Car,
      color: "text-blue-600",
      to: "/admin/fleet",
    },
    {
      title: "Active Reservations",
      value: "45",
      icon: Calendar,
      color: "text-green-600",
      to: "/admin/reservations",
    },
    {
      title: "Total Users",
      value: "1,200",
      icon: Users,
      color: "text-purple-600",
      to: "/admin/users",
    },
    {
      title: "Pending Reviews",
      value: "8",
      icon: FileCheck,
      color: "text-orange-600",
      to: "/admin/documents",
    },
  ] as const;

  const recentReservations = [
    {
      id: "R2023001",
      car: "Toyota Camry",
      user: "Alice Johnson",
      pickupDate: "2023-10-26",
      returnDate: "2023-10-26",
      status: "Confirmado",
    },
    {
      id: "R2023002",
      car: "Honda Civic",
      user: "Bob Williams",
      pickupDate: "2023-10-27",
      returnDate: "2023-10-27",
      status: "Pendente",
    },
    {
      id: "R2023003",
      car: "Ford F-150",
      user: "Charlie Brown",
      pickupDate: "2023-10-28",
      returnDate: "2023-10-28",
      status: "Confirmado",
    },
    {
      id: "R2023004",
      car: "Tesla Model 3",
      user: "Diana Prince",
      pickupDate: "2023-10-29",
      returnDate: "2023-10-29",
      status: "Cancelado",
    },
    {
      id: "R2023002",
      car: "Honda Civic",
      user: "Bob Williams",
      pickupDate: "2023-10-27",
      returnDate: "2023-10-27",
      status: "Pendente",
    },
    {
      id: "R2023003",
      car: "Ford F-150",
      user: "Charlie Brown",
      pickupDate: "2023-10-28",
      returnDate: "2023-10-28",
      status: "Confirmado",
    },
    {
      id: "R2023004",
      car: "Tesla Model 3",
      user: "Diana Prince",
      pickupDate: "2023-10-29",
      returnDate: "2023-10-29",
      status: "Cancelado",
    },
  ];

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

      {/* Stats Grid – sem ring/borda branca, mantém design anterior */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            role="button"
            tabIndex={0}
            onClick={() => navigate(stat.to)}
            onKeyDown={(e) => onKey(e, stat.to)}
            className="shadow-sm border-border/50 cursor-pointer transition hover:bg-card/60
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

      {/* Action Cards – idem, sem ring visível no hover */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-0 bg-[#1558E9]">
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

        <Card className="shadow-sm border-border/50">
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

        <Card className="shadow-sm border-border/50">
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

      {/* Recent Reservations – com scrollbar vertical e header fixo */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-w-full rounded-md border border-border/50">
            <div className="overflow-x-auto">
              <div className="max-h-80 overflow-y-auto overscroll-contain">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 sticky top-0 bg-background z-10">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        RESERVATION ID
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        CAR MODEL
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        USER
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        PICK-UP DATE
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        RETURN DATE
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        STATUS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReservations.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/50 hover:bg-card/50"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-foreground">
                          {r.id}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {r.car}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {r.user}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {r.pickupDate}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {r.returnDate}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={statusChipClasses(r.status)}>
                            {r.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
