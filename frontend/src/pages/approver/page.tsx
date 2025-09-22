import * as React from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileCheck, Users, Eye } from "lucide-react";
import { statusChipClasses } from "@/components/ui/status";

type PendingReservation = {
  id: string;
  car: string;
  user: string;
  pickupDate: string;
  status: string;
};

type PendingDocument = {
  user: string;
  documentType: string;
  uploadedAt: string;
};

export default function ApproverDashboard() {
  const navigate = useNavigate();

  // Destinos centralizados
  const goToReservations = () => navigate("/approver/reservations");
  const goToDocuments = () => navigate("/approver/documents");

  // Cards
  const stats = useMemo(
    () => [
      { title: "Pending Reservations",  value: "2",  icon: Calendar, color: "text-blue-600", to: "/approver/reservations?status=pending" },
      { title: "Approved Reservations", value: "45", icon: Calendar, color: "text-blue-600", to: "/approver/reservations?status=approved" },
      { title: "Documents to Validate", value: "34", icon: Users,    color: "text-blue-600", to: "/approver/documents?status=pending" },
      { title: "Ongoing Checklists",    value: "8",  icon: FileCheck, color: "text-blue-600", to: "/approver/checklist" },
    ],
    []
  );

  // Mock data
  const pendingReservations: PendingReservation[] = [
    { id: "R2023001", car: "Toyota Camry",  user: "Alice Johnson",   pickupDate: "2023-10-26", status: "Pendente" },
    { id: "R2023002", car: "Honda Civic",   user: "Bob Williams",    pickupDate: "2023-10-27", status: "Pendente" },
    { id: "R2023003", car: "Ford Focus",    user: "Charlie Brown",   pickupDate: "2023-10-28", status: "Pendente" },
    { id: "R2023004", car: "Tesla Model 3", user: "Diana Prince",    pickupDate: "2023-10-29", status: "Pendente" },
    { id: "R2023005", car: "VW Golf",       user: "Eve Adams",       pickupDate: "2023-10-30", status: "Pendente" },
    { id: "R2023006", car: "Chevrolet Onix",user: "Peter Parker",    pickupDate: "2023-11-01", status: "Pendente" },
    { id: "R2023007", car: "Renault Kwid",  user: "Natasha Romanoff",pickupDate: "2023-11-02", status: "Pendente" },
  ];

  const documentsToValidate: PendingDocument[] = [
    { user: "Priya Singh", documentType: "Insurance",      uploadedAt: "11 Sep 2025" },
    { user: "Daniel Park", documentType: "Registration",   uploadedAt: "10 Sep 2025" },
    { user: "Alex Chen",   documentType: "Driver License", uploadedAt: "09 Sep 2025" },
    { user: "Priya Singh", documentType: "Insurance",      uploadedAt: "08 Sep 2025" },
    { user: "Daniel Park", documentType: "Registration",   uploadedAt: "07 Sep 2025" },
    { user: "Alex Chen",   documentType: "Driver License", uploadedAt: "06 Sep 2025" },
    { user: "Daniel Park", documentType: "Registration",   uploadedAt: "05 Sep 2025" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      </div>

      {/* Cards clicáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border-border/50 shadow-sm transition hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1558E9]/50"
            onClick={() => navigate(stat.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(stat.to)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Duas tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Pending Reservations */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Pending Reservations</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-[#1558E9] border-[#1558E9] hover:bg-[#1558E9]/5 bg-transparent"
              onClick={goToReservations} // ← View All -> /approver/reservations
            >
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="min-w-full overflow-x-auto">
              {/* altura alinhada com a linha do sidebar */}
              <div className="h-[54vh] min-h-[22rem] overflow-y-auto rounded-md">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">RESERVA ID</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">CAR MODEL</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">USER</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">PICK-UP DATE</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">STATUS</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReservations.map((r, i) => (
                      <tr key={r.id} className={i !== pendingReservations.length - 1 ? "border-b border-border/50" : ""}>
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{r.id}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{r.car}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{r.user}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{r.pickupDate}</td>
                        <td className="py-3 px-4">
                          <Badge className={statusChipClasses(r.status)}>{r.status}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border text-gray-700 hover:bg-card bg-transparent px-3 py-1 h-7 text-xs"
                            onClick={goToReservations} // ← cada "View" vai para /approver/reservations
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Documents Awaiting Validation */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Documents Awaiting Validation</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-[#1558E9] border-[#1558E9] hover:bg-[#1558E9]/5 bg-transparent"
              onClick={goToDocuments} // ← View All -> /approver/documents
            >
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="min-w-full overflow-x-auto">
              <div className="h-[54vh] min-h-[22rem] overflow-y-auto rounded-md">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">USER</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">DOCUMENT</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">UPLOADED</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-sm">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentsToValidate.map((doc, i) => (
                      <tr key={`${doc.user}-${i}`} className={i !== documentsToValidate.length - 1 ? "border-b border-border/50" : ""}>
                        <td className="py-3 px-4 text-sm text-foreground">{doc.user}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{doc.documentType}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{doc.uploadedAt}</td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border text-gray-700 hover:bg-card bg-transparent px-3 py-1 h-7 text-xs"
                            onClick={goToDocuments} // ← cada "View" vai para /approver/documents
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
