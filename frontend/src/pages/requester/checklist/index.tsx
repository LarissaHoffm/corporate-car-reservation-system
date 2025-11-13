import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FileText, Upload } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusChipClasses } from "@/components/ui/status";

type ReservationStatus = "Pending" | "Completed" | "In Progress";

type Reservation = {
  id: string;
  car: string;
  date: string; // dd/mm/yyyy
  status: ReservationStatus;
};

type ChecklistState = Record<string, boolean>;
type UploadedFile = { name: string };

const LS_PREFIX = "reservcar:req:checklist";
const LS_RESERVATIONS = `${LS_PREFIX}:reservations`;
const LS_CHECK = (id: string) => `${LS_PREFIX}:checks:${id}`;
const LS_FILES = (id: string) => `${LS_PREFIX}:files:${id}`;

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

// Mock inicial (seed no LS)
const DEFAULT_RESERVATIONS: Reservation[] = [
  { id: "R2023001", car: "Ford Focus", date: "27/10/2025", status: "Pending" },
  {
    id: "R2023002",
    car: "Toyota Corolla",
    date: "28/10/2025",
    status: "In Progress",
  },
  { id: "R2023003", car: "Honda Civic", date: "01/11/2025", status: "Pending" },
  {
    id: "R2023004",
    car: "VW T-Cross",
    date: "03/11/2025",
    status: "Completed",
  },
];

const CHECKLIST_ITEMS = [
  { id: "tires", label: "Tires" },
  { id: "fuel", label: "Full Tank" },
  { id: "damages", label: "Damages" },
  { id: "cleaning", label: "Cleaning (inside/outside)" },
  { id: "mileage1", label: "Final Mileage" },
  { id: "mileage2", label: "Final Mileage" },
  { id: "mileage3", label: "Final Mileage" },
];

// mapeia status para os chips usados (Pendente/Aprovado/Rejeitado)
function toChipStatus(
  s: ReservationStatus,
): "Pendente" | "Aprovado" | "Rejeitado" {
  if (s === "Completed") return "Aprovado";
  return "Pendente"; // Pending + In Progress
}

export default function RequesterChecklistPage() {
  // Seed/estado da lista
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const stored = readJSON<Reservation[]>(LS_RESERVATIONS);
    if (!stored || stored.length === 0) {
      writeJSON(LS_RESERVATIONS, DEFAULT_RESERVATIONS);
      return DEFAULT_RESERVATIONS;
    }
    return stored;
  });

  // Filtros
  const [carFilter, setCarFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "in-progress" | "completed"
  >("all");

  // Seleção atual (inicia vazio)
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(
    () => reservations.find((r) => r.id === selectedId) ?? null,
    [reservations, selectedId],
  );

  // Checklist e uploads da reserva selecionada
  const [checks, setChecks] = useState<ChecklistState>({});
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs para click-away
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Carregar/persistir estado específico da reserva
  useEffect(() => {
    if (!selected) return;
    const c = readJSON<ChecklistState>(LS_CHECK(selected.id)) ?? {};
    const f = readJSON<UploadedFile[]>(LS_FILES(selected.id)) ?? [];
    setChecks(c);
    setFiles(f);
  }, [selected?.id]);

  useEffect(() => {
    writeJSON(LS_RESERVATIONS, reservations);
  }, [reservations]);

  useEffect(() => {
    if (!selected) return;
    writeJSON(LS_CHECK(selected.id), checks);
  }, [selected?.id, checks]);

  useEffect(() => {
    if (!selected) return;
    writeJSON(LS_FILES(selected.id), files);
  }, [selected?.id, files]);

  // Opções de filtros
  const carOptions = useMemo(() => {
    const set = new Set(reservations.map((r) => r.car));
    return ["all", ...Array.from(set)];
  }, [reservations]);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const byCar = carFilter === "all" || r.car === carFilter;
      const byStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && r.status === "Pending") ||
        (statusFilter === "in-progress" && r.status === "In Progress") ||
        (statusFilter === "completed" && r.status === "Completed");
      return byCar && byStatus;
    });
  }, [reservations, carFilter, statusFilter]);

  // Click-away + ESC (como na tela de Documents)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!selectedId) return;
      const target = e.target as Node;
      const path = (e.composedPath?.() as Node[]) || [];
      const insideList =
        listRef.current &&
        (path.includes(listRef.current) || listRef.current.contains(target));
      const insidePanel =
        panelRef.current &&
        (path.includes(panelRef.current) || panelRef.current.contains(target));
      if (!insideList && !insidePanel) {
        setSelectedId("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId("");
    };

    // captura, para pegar antes dos componentes
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [selectedId]);

  // Handlers
  const handleChooseFile = () => fileInputRef.current?.click();
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFiles((prev) => [...prev, { name: file.name }]);
    e.currentTarget.value = "";
  };

  const handleSend = () => {
    if (!selected) return;
    const hasAny = Object.values(checks).some(Boolean);
    if (!hasAny) {
      alert("Please mark at least one item of the checklist before sending.");
      return;
    }
    setReservations((prev) =>
      prev.map((r) =>
        r.id === selected.id ? { ...r, status: "Completed" } : r,
      ),
    );
    // fecha painel após enviar
    setSelectedId("");
    alert("Checklist sent. Reservation marked as Completed.");
  };

  return (
    <RoleGuard allowedRoles={["REQUESTER"]}>
      <div className="space-y-6">
        {/* Header + filtros (2 apenas) */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">My Checklists</h1>

          <div className="flex gap-3">
            {/* Car filter */}
            <Select value={carFilter} onValueChange={(v) => setCarFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Car" />
              </SelectTrigger>
              <SelectContent>
                {carOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt === "all" ? "All cars" : opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(
                v: "all" | "pending" | "in-progress" | "completed",
              ) => setStatusFilter(v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: My Reservations (lista) */}
          <div ref={listRef}>
            <Card className="border border-border/50 bg-card text-foreground shadow-sm">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  My Reservations
                </h2>

                <div className="overflow-hidden rounded-lg border border-border">
                  {/* header */}
                  <div className="border-b border-border bg-card px-4 py-3">
                    <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground">
                      <div>Reservation ID</div>
                      <div>Car</div>
                      <div>Date</div>
                      <div>Status</div>
                      <div>Actions</div>
                    </div>
                  </div>

                  {/* rows */}
                  <div className="divide-y divide-border/50">
                    {(filtered.length
                      ? filtered
                      : [
                          {
                            id: "—",
                            car: "—",
                            date: "—",
                            status: "Pending" as ReservationStatus,
                          },
                        ]
                    ).map((r) => {
                      const isCompleted = r.status === "Completed";
                      return (
                        <button
                          key={r.id}
                          className="w-full px-4 py-3 text-left transition-colors hover:bg-card/60 focus:outline-none"
                          onClick={() => setSelectedId(r.id)}
                        >
                          <div className="grid grid-cols-5 items-center gap-4 text-sm">
                            <div className="font-medium text-foreground">
                              {r.id}
                            </div>
                            <div className="text-muted-foreground">{r.car}</div>
                            <div className="text-muted-foreground">
                              {r.date}
                            </div>
                            <div>
                              <Badge
                                className={statusChipClasses(
                                  toChipStatus(r.status),
                                )}
                              >
                                {r.status}
                              </Badge>
                            </div>
                            <div className="flex justify-start">
                              <Button
                                size="sm"
                                variant={isCompleted ? "outline" : "default"}
                                className={
                                  isCompleted
                                    ? "bg-transparent"
                                    : "bg-[#1558E9] text-white hover:bg-[#1558E9]/90"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(r.id);
                                }}
                              >
                                {isCompleted ? "View" : "Send"}
                              </Button>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Checklist form / placeholder (igual ao Documents) */}
          <div ref={panelRef}>
            <Card className="border border-border/50 bg-card text-foreground shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Eye className="h-4 w-4" />
                  Checklist Preview
                </CardTitle>
              </CardHeader>

              {selected ? (
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* título + status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-3 w-3 rounded-full bg-muted-foreground/60" />
                        <span className="font-medium">
                          RESERVATION ID: {selected.id}
                        </span>
                      </div>
                      <Badge
                        className={statusChipClasses(
                          toChipStatus(selected.status),
                        )}
                      >
                        {selected.status}
                      </Badge>
                    </div>

                    {/* checklist */}
                    <div>
                      <h3 className="mb-4 text-base font-semibold text-foreground">
                        Mandatory Checklist
                      </h3>
                      <div className="space-y-3">
                        {CHECKLIST_ITEMS.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-card/60"
                          >
                            <Checkbox
                              id={item.id}
                              checked={Boolean(checks[item.id])}
                              onCheckedChange={(v) =>
                                setChecks((prev) => ({
                                  ...prev,
                                  [item.id]: Boolean(v),
                                }))
                              }
                              className="data-[state=checked]:border-[#1558E9] data-[state=checked]:bg-[#1558E9]"
                              disabled={selected.status === "Completed"}
                            />
                            <label
                              htmlFor={item.id}
                              className="flex-1 cursor-pointer text-sm font-medium text-foreground"
                            >
                              {item.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* upload */}
                    <div>
                      <h3 className="mb-4 text-base font-semibold text-foreground">
                        Uploaded Files
                      </h3>

                      <div className="rounded-lg border-2 border-dashed border-border/70 p-6 text-center">
                        <Upload className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">
                          Drag & drop here or click to upload
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept=".jpg,.jpeg,.png,.pdf"
                          disabled={selected.status === "Completed"}
                        />
                        <Button
                          variant="outline"
                          onClick={handleChooseFile}
                          className="border-border bg-transparent"
                          disabled={selected.status === "Completed"}
                        >
                          Choose file
                        </Button>
                      </div>

                      {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {files.map((f, i) => (
                            <div
                              key={`${f.name}-${i}`}
                              className="flex items-center gap-3 rounded-lg border border-border p-3"
                            >
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {f.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* enviar / view */}
                    <div className="pt-2">
                      {selected.status === "Completed" ? (
                        <Button variant="outline" className="w-full">
                          View
                        </Button>
                      ) : (
                        <Button
                          className="w-full bg-[#1558E9] text-white hover:bg-[#1558E9]/90"
                          onClick={handleSend}
                        >
                          Send
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              ) : (
                // Placeholder (igual ao Documents)
                <CardContent className="space-y-4">
                  <div className="h-48 bg-card/50 border border-dashed border-border/50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">
                        Select a reservation to preview
                      </p>
                      <p className="text-xs">
                        Click an item on the left to fill and send the
                        checklist.
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
