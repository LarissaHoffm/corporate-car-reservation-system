import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileText, ImageIcon, Eye } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusChipClasses } from "@/components/ui/status";

type DocStatus = "Pending" | "Validated";

type DocRow = {
  id: string;
  reservationId: string;
  car: string;
  date: string;
  status: DocStatus;
};

type UploadedFile = { name: string };

const LS_PREFIX = "reservcar:req:docs";
const LS_ROWS = `${LS_PREFIX}:rows`;
const LS_FILES = (reservationId: string) => `${LS_PREFIX}:files:${reservationId}`;

const SEED: DocRow[] = [
  { id: "1", reservationId: "R2023001", car: "Ford Focus",    date: "09/08/2025", status: "Pending" },
  { id: "2", reservationId: "R2023002", car: "Toyota Corolla", date: "10/08/2025", status: "Validated" },
];

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

function toChipStatus(s: DocStatus): "Pendente" | "Aprovado" | "Rejeitado" {
  return s === "Validated" ? "Aprovado" : "Pendente";
}

export default function RequesterDocumentsPage() {
  // linhas (seed + persistência)
  const [rows, setRows] = useState<DocRow[]>(() => {
    const stored = readJSON<DocRow[]>(LS_ROWS);
    if (!stored || stored.length === 0) {
      writeJSON(LS_ROWS, SEED);
      return SEED;
    }
    return stored;
  });

  // filtros: apenas Car e Status
  const [carFilter, setCarFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] =
    useState<"all" | "pending" | "validated">("all");

  // seleção atual
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // arquivos por reserva selecionada
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // refs para click-away
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // carregar/persistir
  useEffect(() => {
    writeJSON(LS_ROWS, rows);
  }, [rows]);

  useEffect(() => {
    if (!selected) return;
    const f = readJSON<UploadedFile[]>(LS_FILES(selected.reservationId)) ?? [];
    setFiles(f);
  }, [selected?.reservationId]);

  useEffect(() => {
    if (!selected) return;
    writeJSON(LS_FILES(selected.reservationId), files);
  }, [selected?.reservationId, files]);

  // opções de filtro
  const carOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.car));
    return ["all", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const byCar = carFilter === "all" || r.car === carFilter;
      const byStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && r.status === "Pending") ||
        (statusFilter === "validated" && r.status === "Validated");
      return byCar && byStatus;
    });
  }, [rows, carFilter, statusFilter]);

  // click-away + Esc
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!selectedId) return;
      const target = e.target as Node;
      const path = (e.composedPath?.() as Node[]) || [];
      const insideList = listRef.current && (path.includes(listRef.current) || listRef.current.contains(target));
      const insidePanel = panelRef.current && (path.includes(panelRef.current) || panelRef.current.contains(target));
      if (!insideList && !insidePanel) setSelectedId("");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId("");
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [selectedId]);

  // handlers
  const handleChooseFile = () => fileInputRef.current?.click();
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFiles((prev) => [...prev, { name: file.name }]);
    e.currentTarget.value = "";
  };

  const markValidatedAndClose = () => {
    if (!selected) return;
    setRows((prev) => prev.map((r) => (r.id === selected.id ? { ...r, status: "Validated" } : r)));
    setSelectedId("");
    alert("Documents sent. Reservation marked as Validated.");
  };

  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Header + filtros (apenas Car e Status) */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Upload Required Documents</h1>

          <div className="flex gap-3">
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

            <Select
              value={statusFilter}
              onValueChange={(v: "all" | "pending" | "validated") => setStatusFilter(v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid: lista à esquerda + painel à direita (placeholder até selecionar) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: Tabela de documentos enviados (linhas) */}
          <div ref={listRef}>
            <Card className="border border-border/50 bg-card text-foreground shadow-sm">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">My Uploaded Documents</h2>

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
                    {(filtered.length ? filtered : [{ id:"—", reservationId:"—", car:"—", date:"—", status:"Pending" as DocStatus }]).map((doc) => {
                      const isValidated = doc.status === "Validated";
                      return (
                        <button
                          key={doc.id}
                          className="w-full px-4 py-3 text-left transition-colors hover:bg-card/60 focus:outline-none"
                          onClick={() => setSelectedId(doc.id)}
                        >
                          <div className="grid grid-cols-5 items-center gap-4 text-sm">
                            <div className="font-medium text-foreground">{doc.reservationId}</div>
                            <div className="text-muted-foreground">{doc.car}</div>
                            <div className="text-muted-foreground">{doc.date}</div>
                            <div>
                              <Badge className={statusChipClasses(toChipStatus(doc.status))}>
                                {doc.status}
                              </Badge>
                            </div>
                            <div className="flex justify-start">
                              <Button
                                size="sm"
                                variant={isValidated ? "outline" : "default"}
                                className={
                                  isValidated
                                    ? "bg-transparent"
                                    : "bg-[#1558E9] text-white hover:bg-[#1558E9]/90"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(doc.id);
                                }}
                              >
                                {isValidated ? "View" : "Send"}
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

          {/* RIGHT: Painel (placeholder até selecionar) */}
          <div ref={panelRef}>
            <Card className="border border-border/50 bg-card text-foreground shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Eye className="h-4 w-4" />
                  Documents Preview / Upload
                </CardTitle>
              </CardHeader>

              {selected ? (
                <CardContent className="p-6 space-y-6">
                  {/* Identificação + status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-3 w-3 rounded-full bg-muted-foreground/60" />
                      <span className="font-medium">RESERVATION ID: {selected.reservationId}</span>
                    </div>
                    <Badge className={statusChipClasses(toChipStatus(selected.status))}>
                      {selected.status}
                    </Badge>
                  </div>

                  {/* Driver Documents */}
                  <div className="space-y-3">
                    <h3 className="text-base font-medium text-foreground">Driver Documents</h3>

                    <Card
                      className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                      onClick={handleChooseFile}
                    >
                      <CardContent className="p-4 text-center">
                        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          Upload Driver License (front & back)
                        </p>
                      </CardContent>
                    </Card>

                    <Card
                      className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                      onClick={handleChooseFile}
                    >
                      <CardContent className="p-4 text-center">
                        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          Upload Insurance Proof
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Vehicle Documents */}
                  <div className="space-y-3">
                    <h3 className="text-base font-medium text-foreground">Vehicle Documents</h3>

                    <Card
                      className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                      onClick={handleChooseFile}
                    >
                      <CardContent className="p-4 text-center">
                        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Upload Fuel Receipt</p>
                      </CardContent>
                    </Card>

                    <Card
                      className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                      onClick={handleChooseFile}
                    >
                      <CardContent className="p-4 text-center">
                        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Upload Damage Photos (if any)</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Input de arquivo oculto */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                  />

                  {/* Lista de arquivos */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Uploaded Files</h4>
                    {files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map((f, i) => (
                          <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded border border-border bg-card p-3 text-foreground">
                            {/\.(png|jpg|jpeg)$/i.test(f.name) ? (
                              <ImageIcon className="h-4 w-4 text-[#1558E9]" />
                            ) : (
                              <FileText className="h-4 w-4 text-[#1558E9]" />
                            )}
                            <span className="text-sm">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
                    )}
                  </div>

                  {/* Enviar */}
                  <Button
                    className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90 text-white"
                    onClick={markValidatedAndClose}
                  >
                    Send
                  </Button>
                </CardContent>
              ) : (
                // Placeholder quando nada selecionado
                <CardContent className="space-y-4">
                  <div className="h-48 bg-card/50 border border-dashed border-border/50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">Select a reservation to upload/view documents</p>
                      <p className="text-xs">Click an item on the left to start uploading files.</p>
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
