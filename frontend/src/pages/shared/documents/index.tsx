import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, Check, X, Search } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/http/api";

/* ----------------------------- Tipos locais ----------------------------- */

type DocStatus = "Pending" | "Validated" | "Rejected";

type DocTypeLabel =
  | "Driver License"
  | "Fuel Receipt"
  | "Vehicle Photos"
  | "Other";

type Doc = {
  id: string;
  user: string;
  documentType: DocTypeLabel;
  uploadDate: string;
  status: DocStatus;
  pages: number;
  reservationId: string;
  route: string;
};

type ApiInboxDocument = {
  id: string;
  type: "CNH" | "RECEIPT" | "ODOMETER_PHOTO" | "OTHER";
  status: "APPROVED" | "REJECTED" | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
  reservation: {
    id: string;
    origin: string;
    destination: string;
    startAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  } | null;
};

function mapTypeToLabel(type: ApiInboxDocument["type"]): DocTypeLabel {
  switch (type) {
    case "CNH":
      return "Driver License";
    case "RECEIPT":
      return "Fuel Receipt";
    case "ODOMETER_PHOTO":
      return "Vehicle Photos";
    case "OTHER":
    default:
      return "Other";
  }
}

function mapStatusToDocStatus(status: ApiInboxDocument["status"]): DocStatus {
  if (status === "APPROVED") return "Validated";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

function docStatusChip(s: DocStatus) {
  if (s === "Validated")
    return "bg-green-100 text-green-700 border border-green-200 dark:bg-green-400/15 dark:text-green-500 dark:border-green-500/20";
  if (s === "Rejected")
    return "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-400/15 dark:text-rose-500 dark:border-rose-500/20";
  return "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-400/15 dark:text-amber-500 dark:border-amber-500/20";
}

/* --------------------------------- Page --------------------------------- */

export default function SharedDocumentsPage() {
  const { toast } = useToast();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);

  // filtros
  const [search, setSearch] = useState("");
  const [selectedDocType, setSelectedDocType] = useState<"all" | DocTypeLabel>(
    "all",
  );
  const [selectedStatus, setSelectedStatus] = useState<"all" | DocStatus>(
    "all",
  );

  // seleção + comentário
  const [selectedDocument, setSelectedDocument] = useState<Doc | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");

  // preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // refs p/ clique fora
  const listRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  /* ---------------------------- Carregar inbox ---------------------------- */

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<ApiInboxDocument[]>("/documents");

        const mapped: Doc[] = (data ?? []).map((d) => {
          const userName =
            d.reservation?.user?.name ||
            d.reservation?.user?.email ||
            "—";

          const uploadDate = d.createdAt
            ? new Date(d.createdAt).toLocaleString("pt-BR")
            : "—";

          const pages =
            typeof d.metadata?.pages === "number" ? d.metadata.pages : 1;

          const routeLabel = d.reservation
            ? `${d.reservation.origin} → ${d.reservation.destination}`
            : "—";

          return {
            id: d.id,
            user: userName,
            documentType: mapTypeToLabel(d.type),
            uploadDate,
            status: mapStatusToDocStatus(d.status),
            pages,
            reservationId: d.reservation?.id ?? "",
            route: routeLabel,
          };
        });

        setDocs(mapped);
      } catch (err) {
        console.error(err);
        toast({
          title: "Erro ao carregar documentos",
          description:
            "Não foi possível carregar os documentos para validação.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  /* ------------------------ Clique fora do preview ------------------------ */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || previewRef.current?.contains(t))
        return;
      setSelectedDocument(null);
      setRejectionComment("");
      setPreviewUrl((old) => {
        if (old) window.URL.revokeObjectURL(old);
        return null;
      });
    };
    document.addEventListener("click", handler);
    return () => {
      document.removeEventListener("click", handler);
      setPreviewUrl((old) => {
        if (old) window.URL.revokeObjectURL(old);
        return null;
      });
    };
  }, []);

  /* -------------------- helpers para arquivo/preview -------------------- */

  async function fetchFileBlob(docId: string): Promise<Blob> {
    const response = await api.get(`/documents/${docId}/file`, {
      responseType: "blob",
    });
    return response.data as Blob;
  }

  async function openDocument(doc: Doc) {
    try {
      const blob = await fetchFileBlob(doc.id);
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
  }

  async function loadPreview(doc: Doc) {
    setPreviewLoading(true);
    try {
      const blob = await fetchFileBlob(doc.id);
      const url = window.URL.createObjectURL(blob);

      setPreviewUrl((old) => {
        if (old) window.URL.revokeObjectURL(old);
        return url;
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao carregar preview",
        description:
          "Não foi possível carregar a visualização do documento.",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  /* ----------------------------- Filtro em memória ----------------------------- */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      const byQuery =
        !q ||
        d.user.toLowerCase().includes(q) ||
        d.documentType.toLowerCase().includes(q.toLowerCase()) ||
        d.route.toLowerCase().includes(q.toLowerCase());
      const byType =
        selectedDocType === "all" ? true : d.documentType === selectedDocType;
      const byStatus =
        selectedStatus === "all" ? true : d.status === selectedStatus;
      return byQuery && byType && byStatus;
    });
  }, [docs, search, selectedDocType, selectedStatus]);

  const applyStatus = (id: string, newStatus: DocStatus) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)),
    );
    setSelectedDocument((prev) =>
      prev && prev.id === id ? { ...prev, status: newStatus } : prev,
    );
  };

  const handleSelect = (doc: Doc) => {
    setSelectedDocument(doc);
    setRejectionComment("");
    void loadPreview(doc);
  };

  /* --------------------------- Ações de validação --------------------------- */

  async function validateDoc(doc: Doc) {
    try {
      await api.patch(`/documents/${doc.id}/validate`, {
        result: "APPROVED",
      });
      applyStatus(doc.id, "Validated");
      toast({
        title: "Documento validado",
        description:
          "O documento foi marcado como aprovado. Se todos os documentos da reserva estiverem aprovados, a reserva será concluída.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao validar",
        description:
          "Não foi possível validar o documento. Tente novamente.",
        variant: "destructive",
      });
    }
  }

  // Comentário é OPCIONAL: mesmo sem comentário, vamos rejeitar
  async function rejectDoc(doc: Doc) {
    try {
      await api.patch(`/documents/${doc.id}/validate`, {
        result: "REJECTED",
        // se no futuro o backend aceitar motivo, podemos enviar aqui
        // comment: rejectionComment || null,
      });
      applyStatus(doc.id, "Rejected");
      toast({
        title: "Documento rejeitado",
        description:
          "O documento foi marcado como rejeitado. O solicitante deverá reenviar os arquivos.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao rejeitar",
        description:
          "Não foi possível rejeitar o documento. Tente novamente.",
        variant: "destructive",
      });
    }
  }

  const handleValidate = async () => {
    if (!selectedDocument) return;
    await validateDoc(selectedDocument);
    setSelectedDocument(null);
  };

  const handleReject = async () => {
    if (!selectedDocument) return;
    await rejectDoc(selectedDocument);
    setSelectedDocument(null);
  };

  /* --------------------------------- JSX --------------------------------- */

  return (
    <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">
            Validate or reject uploaded documents.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista / filtros */}
          <div className="space-y-4" ref={listRef}>
            <h2 className="text-lg font-semibold text-foreground">Uploads</h2>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, document type or route…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-border/50 focus:ring-2 focus:ring-[#1558E9] focus:border-[#1558E9] shadow-sm"
                />
              </div>

              <Select
                value={selectedDocType}
                onValueChange={(v: DocTypeLabel | "all") =>
                  setSelectedDocType(v)
                }
              >
                <SelectTrigger className="w-full sm:w-[200px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Driver License">
                    Driver License
                  </SelectItem>
                  <SelectItem value="Fuel Receipt">Fuel Receipt</SelectItem>
                  <SelectItem value="Vehicle Photos">
                    Vehicle Photos
                  </SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedStatus}
                onValueChange={(v: DocStatus | "all") =>
                  setSelectedStatus(v)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Validated">Validated</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* LISTA COM SCROLL */}
            <div className="max-h-[520px] overflow-y-auto pr-1 space-y-3">
              {loading && docs.length === 0 && (
                <p className="text-sm text-muted-foreground px-1">
                  Loading documents…
                </p>
              )}

              {!loading && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground px-1">
                  No documents found for the selected filters.
                </p>
              )}

              {filtered.map((doc) => (
                <Card
                  key={doc.id}
                  onClick={() => handleSelect(doc)}
                  aria-selected={selectedDocument?.id === doc.id}
                  className={`cursor-pointer transition-all border-border/50 shadow-sm hover:shadow-md ${
                    selectedDocument?.id === doc.id
                      ? "ring-2 ring-[#1558E9] border-[#1558E9]/20"
                      : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {doc.user}
                          </span>
                          <Badge className={docStatusChip(doc.status)}>
                            {doc.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {doc.documentType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Route: {doc.route}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.uploadDate}
                        </p>
                      </div>

                      {doc.status === "Pending" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-border/50 shadow-sm hover:bg-card/50 bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              validateDoc(doc);
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Validate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-border/50 shadow-sm hover:bg-card/50 bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Abre painel; rejeição final é pelo botão grande
                              handleSelect(doc);
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Preview / ações */}
          <div className="space-y-4" ref={previewRef}>
            <h2 className="text-lg font-semibold text-foreground">
              Document Preview
            </h2>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Eye className="h-4 w-4" />
                  Image
                </CardTitle>
              </CardHeader>

              {selectedDocument ? (
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium text-foreground">
                        {selectedDocument.user} —{" "}
                        {selectedDocument.documentType}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Route: {selectedDocument.route}
                      </p>
                    </div>
                    <Badge
                      className={docStatusChip(selectedDocument.status)}
                    >
                      {selectedDocument.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Uploaded on {selectedDocument.uploadDate}.{" "}
                    {selectedDocument.pages}{" "}
                    {selectedDocument.pages === 1 ? "page" : "pages"}
                  </p>

                  <div className="h-48 bg-card/50 border border-border/50 rounded-lg flex items-center justify-center overflow-hidden">
                    {previewLoading && (
                      <p className="text-sm text-muted-foreground">
                        Loading preview…
                      </p>
                    )}
                    {!previewLoading && previewUrl && (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full rounded-md"
                        title="Document preview"
                      />
                    )}
                    {!previewLoading && !previewUrl && (
                      <div className="text-center text-muted-foreground">
                        <Eye className="h-8 w-8 mx-auto mb-2" />
                        <p>Document preview will be displayed here.</p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full bg-transparent border-border/50 shadow-sm hover:bg-card/50"
                    onClick={() => {
                      if (selectedDocument) {
                        openDocument(selectedDocument);
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Open / Download Document
                  </Button>

                  {selectedDocument.status === "Pending" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Comment (optional)
                        </label>
                        <Textarea
                          placeholder="Explain the reason for rejection (optional)..."
                          value={rejectionComment}
                          onChange={(e) =>
                            setRejectionComment(e.target.value)
                          }
                          className="min-h-[80px] border-border/50 focus:border-[#1558E9] shadow-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          You can add a reason before rejecting, if needed.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 bg-transparent border-border/50 shadow-sm hover:bg-card/50"
                          onClick={handleReject}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          className="flex-1 bg-[#1558E9] hover:bg-[#1558E9]/90 shadow-sm"
                          onClick={handleValidate}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Validate
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              ) : (
                <CardContent className="space-y-4">
                  <div className="h-48 bg-card/50 border border-dashed border-border/50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">
                        Select a document to preview
                      </p>
                      <p className="text-xs">
                        Click an item on the left to validate or reject.
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
