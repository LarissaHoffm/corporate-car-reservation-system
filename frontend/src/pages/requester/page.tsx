import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  FileText,
  ClipboardCheck,
  Plus,
  X,
  Eye,
  Printer,
} from "lucide-react";
import { statusChipClasses } from "@/components/ui/status";

type ReservationRow = {
  id: string;
  user: string;
  filial: string;
  location: string;
  status: "Active" | "Inactive" | "Cancelled";
  car: string;
  plate: string;
  department: string;
};

const STORAGE_KEY = "reservcar:requester:upcoming";

function readJSON<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
function writeJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// seed
const DEFAULT_ROWS: ReservationRow[] = [
  {
    id: "RQ-1001",
    user: "Alex Morgan",
    filial: "IT",
    location: "JLLE",
    status: "Active",
    car: "Toyota Corolla",
    plate: "ABC-1A23",
    department: "ADM",
  },
  {
    id: "RQ-1002",
    user: "Alex Morgan",
    filial: "IT",
    location: "MGA",
    status: "Active",
    car: "Honda Civic",
    plate: "DEF-4B56",
    department: "ADM",
  },
  {
    id: "RQ-1003",
    user: "Alex Morgan",
    filial: "IT",
    location: "POA",
    status: "Active",
    car: "VW T-Cross",
    plate: "GHI-7C89",
    department: "ADM",
  },
  {
    id: "RQ-1004",
    user: "Alex Morgan",
    filial: "IT",
    location: "JLLE",
    status: "Inactive",
    car: "Chevrolet Onix",
    plate: "JKL-0D12",
    department: "TAX",
  },
];

// mapeia status das linhas para os chips já usados no app
function mapToChipStatus(
  s: ReservationRow["status"],
): "Pendente" | "Aprovado" | "Rejeitado" {
  if (s === "Active") return "Aprovado";
  if (s === "Cancelled") return "Rejeitado";
  return "Pendente";
}

export default function RequesterDashboard() {
  const [rows, setRows] = useState<ReservationRow[]>(() => {
    const existing = readJSON<ReservationRow[]>(STORAGE_KEY);
    if (!existing || !Array.isArray(existing) || existing.length === 0) {
      writeJSON(STORAGE_KEY, DEFAULT_ROWS);
      return DEFAULT_ROWS;
    }
    return existing;
  });
  useEffect(() => writeJSON(STORAGE_KEY, rows), [rows]);

  // dossiê
  const [showDossier, setShowDossier] = useState(false);
  const [selected, setSelected] = useState<ReservationRow | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const openDossier = useCallback((r: ReservationRow) => {
    setSelected(r);
    setShowDossier(true);
  }, []);

  const cancelReservation = useCallback((id: string) => {
    if (!window.confirm("Do you really want to cancel this reservation?"))
      return;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Cancelled" } : r)),
    );
  }, []);

  const printDossier = useCallback(() => {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "print");
    if (!win) return;

    // HTML simples para imprimir só o conteúdo do dossiê
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${selected?.id ?? "Reservation dossier"}</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
            h1,h2,h3 { margin: 0 0 8px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; }
            .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
            .val { color: #111827; font-weight: 600; margin-top: 2px; }
            .row { margin-bottom: 16px; }
            .chip { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; }
          </style>
        </head>
        <body>${node.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }, [selected]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, Alex
        </h1>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="shadow-sm border-border/50 bg-[#1558E9]">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-card/20">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">New Reservation</h3>
                  <p className="text-sm text-white/80">
                    Book a company vehicle for your next trip.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="w-full bg-card text-[#1558E9] hover:bg-card/90"
              >
                <Link to="/requester/reservations/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Reservation
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1558E9]/10">
                  <FileText className="h-6 w-6 text-[#1558E9]" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Upload Documents
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Driver license, fuel receipt, etc.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90"
              >
                <Link to="/requester/documents">Upload Documents</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1558E9]/10">
                  <ClipboardCheck className="h-6 w-6 text-[#1558E9]" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Return Checklist
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Complete vehicle return checklist.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90"
              >
                <Link to="/requester/checklist">Return Checklist</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de próximas reservas */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              My Upcoming Reservations
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/requester/reservations">
                <Eye className="mr-2 h-4 w-4" />
                View All
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    USER
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    CAR
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    PLATE
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    DEPARTMENT
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    STATUS
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((reservation) => (
                  <tr
                    key={reservation.id}
                    className="border-b border-border/50 hover:bg-card/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {reservation.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {reservation.user}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {reservation.car}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {reservation.plate}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {reservation.department}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={statusChipClasses(
                          mapToChipStatus(reservation.status),
                        )}
                      >
                        {mapToChipStatus(reservation.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {reservation.status === "Active" ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 bg-transparent text-red-600 hover:bg-red-50"
                            onClick={() => cancelReservation(reservation.id)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            CANCEL
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDossier(reservation)}
                          >
                            VIEW
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDossier(reservation)}
                        >
                          VIEW
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dossier modal */}
      <Dialog open={showDossier} onOpenChange={setShowDossier}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">
              Reservation dossier — {selected?.id}
            </DialogTitle>
          </DialogHeader>

          <div ref={printRef} className="space-y-6">
            {/* header com status */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {/* espaço reservado */}
              </div>
              {selected && (
                <Badge
                  className={statusChipClasses(
                    mapToChipStatus(selected.status),
                  )}
                >
                  {mapToChipStatus(selected.status)}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              <div>
                <div className="text-sm text-muted-foreground">User</div>
                <div className="text-base font-semibold text-foreground">
                  {selected?.user}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selected
                    ? `${selected.user.toLowerCase().replace(/\s+/g, ".")}@reservcar.com`
                    : "—"}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="mt-1">
                  {selected && (
                    <Badge
                      className={statusChipClasses(
                        mapToChipStatus(selected.status),
                      )}
                    >
                      {mapToChipStatus(selected.status)}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Filial</div>
                <div className="text-base font-medium text-foreground">
                  {selected?.location}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Vehicle</div>
                <div className="text-base font-medium text-foreground">
                  {selected?.car} — {selected?.plate}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Saída</div>
                <div className="text-base font-medium text-foreground">
                  {/* placeholders para MVP */}
                  {new Date().toISOString().slice(0, 10)} • 10:00
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Pickup time</div>
                <div className="text-base font-medium text-foreground">—</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Volta</div>
                <div className="text-base font-medium text-foreground">
                  {new Date(Date.now() + 8 * 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 10)}{" "}
                  • 18:00
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDossier(false)}>
              Close
            </Button>
            <Button
              className="bg-[#1558E9] hover:bg-[#1558E9]/90"
              onClick={printDossier}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print dossier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
