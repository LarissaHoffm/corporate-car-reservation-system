import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileCheck, Users, Eye } from "lucide-react";
import { statusChipClasses } from "@/components/ui/status";

import useReservations from "@/hooks/use-reservations";
import {
  listDocumentsByReservation,
  type Document as ApiDocument,
} from "@/lib/http/documents";
import {
  ChecklistsAPI,
  type PendingChecklistReservation,
} from "@/lib/http/checklists";
import type { Reservation } from "@/lib/http/reservations";
import { makeFriendlyReservationCode } from "@/lib/friendly-reservation-code";

type BasicStatus = "PENDING" | "APPROVED" | "CANCELED" | "COMPLETED";

type PendingDocRow = {
  id: string;
  reservationId: string;
  reservationCode: string;
  userName: string;
  documentType: string;
  uploadedAt?: string;
};

function normalizeReservationStatus(status: string): BasicStatus {
  const s = status?.toString().toUpperCase() ?? "";
  if (s === "PENDING") return "PENDING";
  if (s === "APPROVED") return "APPROVED";
  if (s === "COMPLETED") return "COMPLETED";
  // CANCELED / CANCELLED / qualquer outra variação
  return "CANCELED";
}

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

function fmtDateTime(dt?: string) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("pt-BR");
  } catch {
    return dt;
  }
}

/**
 * Constrói as linhas de documentos pendentes para uma reserva específica.
 */
async function fetchPendingDocsForReservation(
  reservation: Reservation,
): Promise<PendingDocRow[]> {
  try {
    const docs: ApiDocument[] = await listDocumentsByReservation(reservation.id);

    const pendingDocs = docs.filter(
      (doc) => normalizeDocStatus((doc as any).status) === "PENDING",
    );

    return pendingDocs.map<PendingDocRow>((doc) => {
      const uploadedAt =
        (doc as any).createdAt ?? (doc as any).updatedAt ?? undefined;

      return {
        id:
          (doc as any).id ??
          `${reservation.id}-${(doc as any).type ?? "DOC"}`,
        reservationId: reservation.id,
        reservationCode: makeFriendlyReservationCode({
          id: reservation.id,
          code: (reservation as any).code ?? null,
        }),
        userName: reservation.user?.name ?? "—",
        documentType: (doc as any).type ?? "Document",
        uploadedAt,
      };
    });
  } catch {
    // Falha ao buscar docs de uma reserva específica não deve quebrar o resto
    return [];
  }
}

/**
 * Busca e agrega todos os documentos pendentes para a lista de reservas.
 */
async function loadPendingDocsForReservations(
  reservations: Reservation[],
): Promise<PendingDocRow[]> {
  if (!reservations.length) {
    return [];
  }

  const perReservation = await Promise.all(
    reservations.map((reservation) =>
      fetchPendingDocsForReservation(reservation),
    ),
  );

  return perReservation.flat();
}

/**
 * Busca checklists pendentes para o approver e filtra apenas os "PENDING".
 */
async function fetchPendingChecklistsForApprover(): Promise<
  PendingChecklistReservation[]
> {
  const rows = await ChecklistsAPI.listPendingForApprover();

  // Usa o status agregado que o backend retorna hoje:
  // status: "Pending" | "Validated" | "Rejected"
  // (e se um dia vier checklistStatus separado, também cobre)
  return rows.filter((r) => {
    const raw =
      (r as any).checklistStatus != null
        ? (r as any).checklistStatus
        : (r as any).status;

    if (!raw) return false;
    const s = String(raw).toUpperCase();
    return s === "PENDING";
  });
}

export default function ApproverDashboard() {
  const navigate = useNavigate();

  const { items, loading, errors, refresh } = useReservations();

  // carregar reservas (cards + tabela esquerda)
  useEffect(() => {
    refresh();
  }, [refresh]);

  const list = items ?? [];

  // --- Pending / Approved (cards + tabela esquerda) ---
  const pendingReservations: Reservation[] = useMemo(
    () =>
      list
        .filter(
          (r) => normalizeReservationStatus((r as any).status) === "PENDING",
        )
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        ),
    [list],
  );

  const approvedReservationsCount = useMemo(
    () =>
      list.filter(
        (r) => normalizeReservationStatus((r as any).status) === "APPROVED",
      ).length,
    [list],
  );

  // --- Documentos aguardando validação (card + tabela direita) ---
  const [pendingDocs, setPendingDocs] = useState<PendingDocRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!list.length) {
        setPendingDocs([]);
        return;
      }

      setLoadingDocs(true);
      setDocsError(undefined);

      try {
        const docs = await loadPendingDocsForReservations(list);
        if (!cancelled) {
          setPendingDocs(docs);
        }
      } catch {
        if (!cancelled) {
          setDocsError("Não foi possível carregar documentos pendentes.");
          setPendingDocs([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingDocs(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [list]);

  const documentsToValidateCount = pendingDocs.length;

  // --- Checklists pendentes para o approver (card) ---
  const [pendingChecklists, setPendingChecklists] = useState<
    PendingChecklistReservation[]
  >([]);
  const [loadingChecklists, setLoadingChecklists] = useState(false);
  const [checklistsError, setChecklistsError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadingChecklists(true);
      setChecklistsError(undefined);

      try {
        const rows = await fetchPendingChecklistsForApprover();
        if (!cancelled) {
          setPendingChecklists(rows);
        }
      } catch {
        if (!cancelled) {
          setPendingChecklists([]);
          setChecklistsError(
            "Não foi possível carregar checklists pendentes para validação.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingChecklists(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const pendingChecklistsCount = pendingChecklists.length;

  // Destinos centralizados
  const goToReservations = () => navigate("/approver/reservations");
  const goToDocuments = () => navigate("/approver/documents");

  // Cards usando valores reais
  const stats = useMemo(
    () => [
      {
        title: "Pending Reservations",
        value: String(pendingReservations.length),
        icon: Calendar,
        color: "text-blue-600",
        to: "/approver/reservations?status=pending",
      },
      {
        title: "Approved Reservations",
        value: String(approvedReservationsCount),
        icon: Calendar,
        color: "text-blue-600",
        to: "/approver/reservations?status=approved",
      },
      {
        title: "Documents to Validate",
        value: String(documentsToValidateCount),
        icon: Users,
        color: "text-blue-600",
        to: "/approver/documents?status=pending",
      },
      {
        title: "Checklists to Validate",
        value: String(pendingChecklistsCount),
        icon: FileCheck,
        color: "text-blue-600",
        to: "/approver/checklist",
      },
    ],
    [
      pendingReservations.length,
      approvedReservationsCount,
      documentsToValidateCount,
      pendingChecklistsCount,
    ],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      </div>

      {/* Cards clicáveis */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Duas tabelas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT: Pending Reservations */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">
              Pending Reservations
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-[#1558E9] border-[#1558E9] hover:bg-[#1558E9]/5 bg-transparent"
              onClick={goToReservations}
            >
              <Eye className="mr-2 h-4 w-4" />
              View All
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="min-w-full overflow-x-auto">
              <div className="h-[54vh] min-h-[22rem] overflow-y-auto rounded-md">
                {loading.list ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    Loading pending reservations…
                  </div>
                ) : pendingReservations.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No pending reservations at the moment.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr className="border-b border-border/50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          RESERVATION
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          CAR MODEL
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          USER
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          PICK-UP DATE
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
                      {pendingReservations.map((r, i) => (
                        <tr
                          key={r.id}
                          className={
                            i !== pendingReservations.length - 1
                              ? "border-b border-border/50"
                              : ""
                          }
                        >
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            {makeFriendlyReservationCode({
                              id: r.id,
                              code: (r as any).code ?? null,
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {r.car?.model ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {r.user?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {fmtDateTime(r.startAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={statusChipClasses("Pendente")}>
                              Pendente
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border text-gray-700 hover:bg-card bg-transparent px-3 py-1 h-7 text-xs"
                              onClick={goToReservations}
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {errors.list && !loading.list && (
                  <p className="px-4 pb-3 pt-1 text-xs text-red-600">
                    {errors.list}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Documents Awaiting Validation */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">
              Documents Awaiting Validation
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-[#1558E9] border-[#1558E9] hover:bg-[#1558E9]/5 bg-transparent"
              onClick={goToDocuments}
            >
              <Eye className="mr-2 h-4 w-4" />
              View All
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="min-w-full overflow-x-auto">
              <div className="h-[54vh] min-h-[22rem] overflow-y-auto rounded-md">
                {loadingDocs ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    Loading documents…
                  </div>
                ) : pendingDocs.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    No documents waiting for validation.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr className="border-b border-border/50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          USER
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          DOCUMENT
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          UPLOADED
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDocs.map((doc, i) => (
                        <tr
                          key={doc.id}
                          className={
                            i !== pendingDocs.length - 1
                              ? "border-b border-border/50"
                              : ""
                          }
                        >
                          <td className="px-4 py-3 text-sm text-foreground">
                            {doc.userName}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {doc.documentType}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {fmtDateTime(doc.uploadedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border text-gray-700 hover:bg-card bg-transparent px-3 py-1 h-7 text-xs"
                              onClick={goToDocuments}
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {docsError && !loadingDocs && (
                  <p className="px-4 pb-3 pt-1 text-xs text-red-600">
                    {docsError}
                  </p>
                )}

                {checklistsError && !loadingChecklists && (
                  <p className="px-4 pb-3 pt-1 text-xs text-red-600">
                    {checklistsError}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
