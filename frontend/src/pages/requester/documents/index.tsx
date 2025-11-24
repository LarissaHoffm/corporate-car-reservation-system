import * as React from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Upload, FileText, ImageIcon, Eye, RefreshCcw } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusChipClasses } from "@/components/ui/status";
import { useToast } from "@/components/ui/use-toast";

import { makeFriendlyReservationCode } from "@/lib/friendly-reservation-code";
import { api } from "@/lib/http/api";
import {
  uploadDocumentForReservation,
  listDocumentsByReservation,
  type Document as ApiDocument,
  type DocumentType,
} from "@/lib/http/documents";

type DocStatus = "Pending" | "InValidation" | "PendingDocs" | "Validated";

type DocRow = {
  id: string; // reservation id
  reservationId: string;
  displayId: string; // friendly reservation code (RES-XXXXXXX)
  car: string;
  date: string;
  status: DocStatus;
};

type ApiReservation = {
  id: string;
  origin: string;
  destination: string;
  startAt: string;
  status: string;
  code?: string | null;
  car?: {
    model?: string | null;
    plate?: string | null;
  } | null;
};

type ListMyReservationsResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ApiReservation[];
  data?: ApiReservation[];
};

function normalizeDocStatus(raw: any): "PENDING" | "APPROVED" | "REJECTED" {
  if (raw == null) return "PENDING";

  const s = String(raw).toUpperCase();

  if (s === "APPROVED" || s === "VALIDATED" || s === "APPROVE") {
    return "APPROVED";
  }

  if (s === "REJECTED" || s === "REJECT") {
    return "REJECTED";
  }

  return "PENDING";
}

/**
 * Mesma regra do backend:
 * - Agrupa por `type`
 * - Considera SÓ o documento mais recente de cada tipo
 */
function docStatusFromDocuments(docs: ApiDocument[]): DocStatus {
  if (!docs.length) {
    return "Pending";
  }

  let anyPending = false;
  let anyApproved = false;
  let anyRejected = false;

  for (const raw of docs as any[]) {
    const normStatus = normalizeDocStatus(raw.status);

    if (normStatus === "APPROVED") {
      anyApproved = true;
    } else if (normStatus === "REJECTED") {
      anyRejected = true;
    } else {
      // tudo que não for APPROVED / REJECTED tratamos como pendente
      anyPending = true;
    }
  }

  if (anyPending) return "InValidation";
  if (anyApproved) return "Validated";
  if (anyRejected) return "PendingDocs";
  return "Pending";
}

function docStatusToChip(s: DocStatus): "Pendente" | "Aprovado" | "Rejeitado" {
  if (s === "Validated") return "Aprovado";
  if (s === "PendingDocs") return "Rejeitado";
  return "Pendente"; // Pending / InValidation usam mesma cor "warning"
}

export default function RequesterDocumentsPage() {
  const { toast } = useToast();

  const [rows, setRows] = useState<DocRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  // filtros: apenas Car e Status
  const [carFilter, setCarFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "invalidation" | "pendingdocs" | "validated"
  >("all");

  // seleção atual
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // documentos da reserva selecionada
  const [files, setFiles] = useState<ApiDocument[]>([]);
  const [currentDocType, setCurrentDocType] =
    useState<DocumentType | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // refs para click-away
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Carregar reservas do usuário
  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    try {
      const { data } = await api.get<ListMyReservationsResponse>(
        "/reservations/me",
        { params: { page: 1, pageSize: 50 } },
      );

      const arr: ApiReservation[] = data.items ?? data.data ?? [];

      const result: DocRow[] = [];

      for (const r of arr) {
        // Não faz sentido exibir documentos para reservas canceladas
        if (r.status === "CANCELED") continue;

        // Só consideramos reservas com carro vinculado (aprovadas/completas)
        if (!r.car || !r.car.model) continue;

        let docs: ApiDocument[] = [];
        try {
          docs = await listDocumentsByReservation(r.id);
        } catch {
          docs = [];
        }

        // Essa tela só mostra reservas que já têm ao menos 1 documento
        if (!docs.length) continue;

        const carLabel = r.car?.model ?? r.car?.plate ?? "—";

        let date = "—";
        const d = r.startAt ? new Date(r.startAt) : null;
        if (d && !Number.isNaN(d.getTime())) {
          date = d.toLocaleDateString("pt-BR");
        }

        const status = docStatusFromDocuments(docs);

        const displayId = makeFriendlyReservationCode({
          id: r.id,
          code: r.code ?? null,
        });

        result.push({
          id: r.id,
          reservationId: r.id,
          displayId,
          car: carLabel,
          date,
          status,
        });
      }

      setRows(result);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao carregar reservas",
        description:
          "Não foi possível carregar suas reservas para upload de documentos.",
        variant: "destructive",
      });
    } finally {
      setLoadingRows(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (!selectedId) {
      setFiles([]);
      return;
    }

    let cancelled = false;

    const loadDocs = async () => {
      try {
        const docs = await listDocumentsByReservation(selectedId);
        if (!cancelled) setFiles(docs);
      } catch (err) {
        console.error(err);
        if (!cancelled) setFiles([]);
      }
    };

    void loadDocs();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Filtros em memória
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
        (statusFilter === "invalidation" && r.status === "InValidation") ||
        (statusFilter === "pendingdocs" && r.status === "PendingDocs") ||
        (statusFilter === "validated" && r.status === "Validated");

      return byCar && byStatus;
    });
  }, [rows, carFilter, statusFilter]);

  const rowsForTable: DocRow[] =
    filtered.length > 0
      ? filtered
      : [
          {
            id: "__placeholder__",
            reservationId: "—",
            displayId: "—",
            car: "—",
            date: "—",
            status: "Pending",
          },
        ];

  // Para permitir reenvio apenas se houver docs rejeitados SEM um novo doc ativo daquele tipo:
  const hasActiveDocOfType = (type: DocumentType) =>
    files.some((f: any) => {
      const t = f.type as DocumentType | undefined;
      const status = f.status as "APPROVED" | "REJECTED" | null | undefined;
      if (t !== type) return false;
      // "ativo" = pendente (null) ou aprovado; rejeitado não conta
      return status === "APPROVED" || status == null;
    });

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!selectedId) return;
      const target = e.target as Node;
      const path = (e as any).composedPath?.() as Node[] | undefined;
      const insideList =
        listRef.current &&
        (path?.includes(listRef.current) ||
          listRef.current.contains(target));
      const insidePanel =
        panelRef.current &&
        (path?.includes(panelRef.current) ||
          panelRef.current.contains(target));
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

  // Abrir arquivo (preview/download)
  const openFile = async (doc: ApiDocument) => {
    try {
      const response = await api.get(`/documents/${doc.id}/file`, {
        responseType: "blob",
      });

      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank");

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60_000);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao abrir documento",
        description:
          "Não foi possível carregar o arquivo. Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const handleChooseFile = (type: DocumentType) => {
    if (!selected) return;
    setCurrentDocType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";

    if (!file || !selected) return;

    try {
      setUploading(true);
      await uploadDocumentForReservation(selected.id, {
        file,
        type: currentDocType,
      });
      const docs = await listDocumentsByReservation(selected.id);
      setFiles(docs);

      const newStatus = docStatusFromDocuments(docs);

      setRows((prev) =>
        prev.map((r) =>
          r.id === selected.id ? { ...r, status: newStatus } : r,
        ),
      );

      toast({
        title: "Documento enviado",
        description: "Seu arquivo foi enviado com sucesso.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao enviar documento",
        description:
          "Não foi possível enviar o arquivo. Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const markSentAndClose = () => {
    if (!selected) return;
    setSelectedId("");
    toast({
      title: "Documents sent",
      description: "Reservation documents sent for validation.",
    });
  };

  const handleRefreshClick = () => {
    void loadRows();
    setSelectedId("");
    setFiles([]);
  };

  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Header + filtros (Car e Status) */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Upload Required Documents
          </h1>

          <div className="flex gap-3">
            <Select
              value={carFilter}
              onValueChange={(v) => setCarFilter(v)}
              disabled={loadingRows}
            >
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
              onValueChange={(
                v: "all" | "pending" | "invalidation" | "pendingdocs" | "validated",
              ) => setStatusFilter(v)}
              disabled={loadingRows}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="invalidation">In validation</SelectItem>
                <SelectItem value="pendingdocs">Pending docs</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleRefreshClick}
              disabled={loadingRows}
            >
              {loadingRows ? (
                <>
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  Refresh
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Grid: lista à esquerda + painel à direita */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT */}
          <div ref={listRef}>
            <Card className="border border-border/50 bg-card text-foreground shadow-sm">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  My Uploaded Documents
                </h2>

                <div className="overflow-hidden rounded-lg border border-border">
                  {/* header */}
                  <div className="border-b border-border bg-card px-4 py-3">
                    <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground">
                      <div>Reservation</div>
                      <div>Car</div>
                      <div>Date</div>
                      <div>Status</div>
                      <div>Actions</div>
                    </div>
                  </div>

                  {/* rows com scroll */}
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
                    {rowsForTable.map((doc) => {
                      const isPlaceholder = doc.id === "__placeholder__";

                      const showSend = doc.status === "PendingDocs";

                      return (
                        <button
                          key={doc.id}
                          type="button"
                          className="w-full px-4 py-3 text-left transition-colors hover:bg-card/60 focus:outline-none"
                          onClick={() => {
                            if (isPlaceholder) return;
                            setSelectedId(doc.id);
                          }}
                          disabled={isPlaceholder || loadingRows}
                        >
                          <div className="grid grid-cols-5 items-center gap-4 text-sm">
                            <div className="font-medium text-foreground">
                              {doc.displayId}
                            </div>
                            <div className="text-muted-foreground">
                              {doc.car}
                            </div>
                            <div className="text-muted-foreground">
                              {doc.date}
                            </div>
                            <div>
                              <Badge
                                className={statusChipClasses(
                                  docStatusToChip(doc.status),
                                )}
                              >
                                {doc.status === "Pending"
                                  ? "Pending"
                                  : doc.status === "InValidation"
                                  ? "In validation"
                                  : doc.status === "PendingDocs"
                                  ? "Pending docs"
                                  : "Validated"}
                              </Badge>
                            </div>
                            <div className="flex justify-start">
                              <Button
                                size="sm"
                                variant={showSend ? "default" : "outline"}
                                className={
                                  showSend
                                    ? "bg-[#1558E9] text-white hover:bg-[#1558E9]/90"
                                    : "bg-transparent"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPlaceholder) return;
                                  setSelectedId(doc.id);
                                  // envio efetivo = upload no painel da direita
                                }}
                                disabled={isPlaceholder || loadingRows}
                              >
                                {showSend ? "Send" : "View"}
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

          {/* RIGHT */}
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
                      <span className="font-medium">
                        RESERVATION: {selected.displayId}
                      </span>
                    </div>
                    <Badge
                      className={statusChipClasses(
                        docStatusToChip(selected.status),
                      )}
                    >
                      {selected.status === "Pending"
                        ? "Pending"
                        : selected.status === "InValidation"
                        ? "In validation"
                        : selected.status === "PendingDocs"
                        ? "Pending docs"
                        : "Validated"}
                    </Badge>
                  </div>

                  {/* Driver Documents */}
                  {selected.status === "PendingDocs" && (
                    <>
                      <div className="space-y-3">
                        <h3 className="text-base font-medium text-foreground">
                          Driver Documents
                        </h3>

                        {!hasActiveDocOfType("CNH") && (
                          <Card
                            className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                            onClick={() => handleChooseFile("CNH")}
                          >
                            <CardContent className="p-4 text-center">
                              <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                              <p className="text-sm font-medium text-foreground">
                                Upload Driver License (front & back)
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {!hasActiveDocOfType("OTHER") && (
                          <Card
                            className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                            onClick={() => handleChooseFile("OTHER")}
                          >
                            <CardContent className="p-4 text-center">
                              <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                              <p className="text-sm font-medium text-foreground">
                                Upload Insurance Proof
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Vehicle Documents */}
                      <div className="space-y-3">
                        <h3 className="text-base font-medium text-foreground">
                          Vehicle Documents
                        </h3>

                        {!hasActiveDocOfType("RECEIPT") && (
                          <Card
                            className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                            onClick={() => handleChooseFile("RECEIPT")}
                          >
                            <CardContent className="p-4 text-center">
                              <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                              <p className="text-sm font-medium text-foreground">
                                Upload Fuel Receipt
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {!hasActiveDocOfType("ODOMETER_PHOTO") && (
                          <Card
                            className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                            onClick={() =>
                              handleChooseFile("ODOMETER_PHOTO")
                            }
                          >
                            <CardContent className="p-4 text-center">
                              <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                              <p className="text-sm font-medium text-foreground">
                                Upload Damage Photos (if any)
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Input de arquivo oculto */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                    </>
                  )}

                  {/* Lista de arquivos */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">
                      Uploaded Files
                    </h4>
                    {files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map((f) => {
                          const filename =
                            (f as any).metadata?.filename ??
                            (f as any).url?.split("/").pop() ??
                            (f as any).id;
                          const isImage = /\.(png|jpg|jpeg)$/i.test(
                            filename ?? "",
                          );
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => openFile(f)}
                              className="flex w-full items-center gap-2 rounded border border-border bg-card p-3 text-left text-foreground transition-colors hover:bg-muted/40"
                            >
                              {isImage ? (
                                <ImageIcon className="h-4 w-4 text-[#1558E9]" />
                              ) : (
                                <FileText className="h-4 w-4 text-[#1558E9]" />
                              )}
                              <span className="text-sm">{filename}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No files uploaded yet.
                      </p>
                    )}
                  </div>

                  {/* Botão principal: aqui só faz sentido quando veio de PendingDocs */}
                  {selected.status === "PendingDocs" && (
                    <Button
                      className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90 text-white"
                      onClick={markSentAndClose}
                      disabled={uploading}
                    >
                      Send
                    </Button>
                  )}
                </CardContent>
              ) : (
                <CardContent className="space-y-4">
                  <div className="h-48 bg-card/50 border border-dashed border-border/50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">
                        Select a reservation to upload/view documents
                      </p>
                      <p className="text-xs">
                        Click an item on the left to start uploading files or
                        check statuses.
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>

        {/* Aviso LGPD em toda a largura, rodapé da página */}
        <div className="mt-2 rounded-md border border-border/40 bg-muted/10 px-4 py-3">
          <p className="text-xs text-muted-foreground text-center">
            Seus documentos são usados apenas para validação da reserva,
            armazenados com segurança e acessados somente por usuarios autorizados.
          </p>
        </div>
      </div>
    </RoleGuard>
  );
}
