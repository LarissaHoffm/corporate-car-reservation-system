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

type DocStatus = "Pending" | "Validated" | "Rejected";

type Doc = {
  id: string;
  user: string;
  documentType: "Driver License" | "Insurance" | "Registration";
  uploadDate: string;
  status: DocStatus;
  pages: number;
};

const SEED: Doc[] = [
  {
    id: "1",
    user: "John Perry",
    documentType: "Driver License",
    uploadDate: "09/08/2025 14:20",
    status: "Pending",
    pages: 2,
  },
  {
    id: "2",
    user: "Alex Chen",
    documentType: "Insurance",
    uploadDate: "12/09/2025 10:15",
    status: "Validated",
    pages: 1,
  },
  {
    id: "3",
    user: "Priya Singh",
    documentType: "Registration",
    uploadDate: "11/09/2025 16:30",
    status: "Pending",
    pages: 3,
  },
];

function docStatusChip(s: DocStatus) {
  if (s === "Validated")
    return "bg-green-100 text-green-700 border border-green-200 dark:bg-green-400/15 dark:text-green-500 dark:border-green-500/20";
  if (s === "Rejected")
    return "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-400/15 dark:text-rose-500 dark:border-rose-500/20";
  return "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-400/15 dark:text-amber-500 dark:border-amber-500/20";
}

export default function SharedDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>(SEED);

  // filtros
  const [search, setSearch] = useState(""); // <— barra de pesquisa
  const [selectedDocType, setSelectedDocType] = useState<
    "all" | Doc["documentType"]
  >("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | DocStatus>(
    "all",
  );

  // seleção + rejeição
  const [selectedDocument, setSelectedDocument] = useState<Doc | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");

  // refs p/ clique fora
  const listRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // filtra em memória
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      const byQuery =
        !q ||
        d.user.toLowerCase().includes(q) ||
        d.documentType.toLowerCase().includes(q);
      const byType =
        selectedDocType === "all" ? true : d.documentType === selectedDocType;
      const byStatus =
        selectedStatus === "all" ? true : d.status === selectedStatus;
      return byQuery && byType && byStatus;
    });
  }, [docs, search, selectedDocType, selectedStatus]);

  const handleSelect = (doc: Doc) => {
    setSelectedDocument(doc);
    setRejectionComment("");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || previewRef.current?.contains(t))
        return;
      setSelectedDocument(null);
      setRejectionComment("");
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const applyStatus = (id: string, newStatus: DocStatus) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)),
    );
    setSelectedDocument((prev) =>
      prev && prev.id === id ? { ...prev, status: newStatus } : prev,
    );
  };

  const handleValidate = () => {
    if (!selectedDocument) return;
    applyStatus(selectedDocument.id, "Validated");
    setSelectedDocument(null);
  };

  const handleReject = () => {
    if (!selectedDocument) return;
    applyStatus(selectedDocument.id, "Rejected");
    setSelectedDocument(null);
  };

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
              {/* Search bar no padrão das demais telas */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user or document type…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-border/50 focus:ring-2 focus:ring-[#1558E9] focus:border-[#1558E9] shadow-sm"
                />
              </div>

              <Select
                value={selectedDocType}
                onValueChange={(v: any) => setSelectedDocType(v)}
              >
                <SelectTrigger className="w-full sm:w-[200px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Driver License">Driver License</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Registration">Registration</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedStatus}
                onValueChange={(v: any) => setSelectedStatus(v)}
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

            <div className="space-y-3">
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
                              applyStatus(doc.id, "Validated");
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
                              applyStatus(doc.id, "Rejected");
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

              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground px-1">
                  No documents found for the selected filters.
                </p>
              )}
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
                    <h3 className="font-medium text-foreground">
                      {selectedDocument.user} — {selectedDocument.documentType}
                    </h3>
                    <Badge className={docStatusChip(selectedDocument.status)}>
                      {selectedDocument.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Uploaded on {selectedDocument.uploadDate}.{" "}
                    {selectedDocument.pages} pages
                  </p>

                  <div className="h-48 bg-card/50 border border-border/50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p>Document preview would be displayed here</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full bg-transparent border-border/50 shadow-sm hover:bg-card/50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Document
                  </Button>

                  {selectedDocument.status === "Pending" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Comment (required when rejecting)
                        </label>
                        <Textarea
                          placeholder="Explain the reason for rejection..."
                          value={rejectionComment}
                          onChange={(e) => setRejectionComment(e.target.value)}
                          className="min-h-[80px] border-border/50 focus:border-[#1558E9] shadow-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Provide a comment when clicking Reject.
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
