import * as React from "react";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
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
  Eye,
  Printer,
  ArrowRight,
  XCircle,
  Loader2,
} from "lucide-react";

import { statusChipClasses } from "@/components/ui/status";
import { ReservationStatusBadge } from "@/components/reservation-status-badge";

import { useAuth } from "@/lib/auth";
import useReservations from "@/hooks/use-reservations";
import {
  listDocumentsByReservation,
  type Document as ApiDocument,
} from "@/lib/http/documents";
import {
  ChecklistsAPI,
  type ChecklistSubmission,
} from "@/lib/http/checklists";
import { makeFriendlyReservationCode } from "@/lib/friendly-reservation-code";

type ReservationStatus = "PENDING" | "APPROVED" | "CANCELED" | "COMPLETED";

type ReservationRow = {
  reservationId: string; // id real da reserva
  id: string; // código amigável (RES-XXXXXXX ou code do backend)
  user: string;
  filial: string;
  location: string;
  status: ReservationStatus;
  car: string;
  plate: string;
  department: string;
  origin: string;
  destination: string;
  startAt: string | null;
  endAt: string | null;
};

// Status agregados de documentos (mesma lógica da página de reservations)
type DocStatus = "Pending" | "InValidation" | "PendingDocs" | "Validated";
type ChecklistDecision = "APPROVED" | "REJECTED" | null;

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
 * Mesma regra do backend / tela de reservations:
 * - agrupa por `type`
 * - considera só o documento mais recente de cada tipo
 * - retorna um status agregado
 */
function docStatusFromDocuments(docs: ApiDocument[]): DocStatus {
  if (!docs.length) {
    return "Pending";
  }

  type Agg = {
    latestTs: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
  };

  const byType = new Map<string, Agg>();

  docs.forEach((raw, index) => {
    const type = (raw.type as string | undefined) ?? "__NO_TYPE__";

    const createdAt =
      (raw as any).updatedAt ?? (raw as any).createdAt ?? null;
    const ts =
      createdAt != null ? new Date(createdAt as any).getTime() : index;

    const status = normalizeDocStatus((raw as any).status);

    const current = byType.get(type);
    if (!current || ts >= current.latestTs) {
      byType.set(type, { latestTs: ts, status });
    }
  });

  let anyPending = false;
  let anyRejected = false;
  let anyApproved = false;

  for (const agg of byType.values()) {
    if (agg.status === "PENDING") {
      anyPending = true;
    } else if (agg.status === "REJECTED") {
      anyRejected = true;
    } else if (agg.status === "APPROVED") {
      anyApproved = true;
    }
  }

  if (anyPending) return "InValidation";
  if (anyRejected) return "PendingDocs";
  if (anyApproved) return "Validated";
  return "Pending";
}

/**
 * Mesmo normalizador que usamos na tela de My Checklists:
 * extrai APPROVED / REJECTED de submission + payload.
 */
function normalizeChecklistDecision(source: any): ChecklistDecision {
  if (!source) return null;

  const raw =
    // campos top-level da submissão
    source.decision ??
    source.result ??
    source.status ??
    // ou dentro do payload
    source.payload?.decision ??
    source.payload?.result ??
    source.payload?.status ??
    null;

  if (!raw || typeof raw !== "string") return null;
  const s = raw.toUpperCase();
  if (s === "APPROVED" || s === "VALIDATED") return "APPROVED";
  if (s === "REJECTED") return "REJECTED";
  return null;
}

/**
 * Mesma função da página de My Reservations:
 * combina status de reserva + docs + checklist.
 */
function getStatusPresentation(
  reservationStatus: ReservationStatus,
  docStatus?: DocStatus,
  validationResult?: string | null,
): {
  badgeStatus: "pending" | "approved" | "cancelled" | "inactive";
  chipLabel: "Pendente" | "Aprovado" | "Rejeitado";
  text: string;
} {
  const normalizedResult =
    validationResult && String(validationResult).toUpperCase();
  const isChecklistRejected = normalizedResult === "CHECKLIST_REJECTED";

  // Caso especial: sempre exibir
  // "COMPLETED — Checklist rejected"
  if (isChecklistRejected) {
    return {
      badgeStatus: "approved",
      chipLabel: "Aprovado",
      text: "Completed — Checklist rejected",
    };
  }

  // COMPLETED "normal"
  if (reservationStatus === "COMPLETED") {
    return {
      badgeStatus: "approved",
      chipLabel: "Aprovado",
      text: "Completed",
    };
  }

  if (reservationStatus === "PENDING") {
    return {
      badgeStatus: "pending",
      chipLabel: "Pendente",
      text: "Pending",
    };
  }

  if (reservationStatus === "CANCELED") {
    return {
      badgeStatus: "cancelled",
      chipLabel: "Rejeitado",
      text: "Canceled",
    };
  }

  // APPROVED
  if (reservationStatus === "APPROVED") {
    // Sem documentos ainda → mostrar APROVADO
    if (!docStatus) {
      return {
        badgeStatus: "approved",
        chipLabel: "Aprovado",
        text: "Approved",
      };
    }

    // Docs enviados / em validação
    if (docStatus === "Pending" || docStatus === "InValidation") {
      return {
        badgeStatus: "pending",
        chipLabel: "Pendente",
        text: "Pending validation",
      };
    }

    // Docs rejeitados (algum tipo sem aprovado)
    if (docStatus === "PendingDocs") {
      return {
        badgeStatus: "cancelled",
        chipLabel: "Rejeitado",
        text: "Documents rejected",
      };
    }

    // Docs validados, mas reserva ainda não COMPLETED (aguardando checklist)
    if (docStatus === "Validated") {
      return {
        badgeStatus: "pending",
        chipLabel: "Pendente",
        text: "Pending validation",
      };
    }
  }

  // fallback
  return {
    badgeStatus: "pending",
    chipLabel: "Pendente",
    text: reservationStatus,
  };
}

// status da reserva para o chip do modal
function mapToChipStatus(
  s: ReservationStatus,
): "Pendente" | "Aprovado" | "Rejeitado" {
  switch (s) {
    case "PENDING":
      return "Pendente";
    case "APPROVED":
    case "COMPLETED":
      return "Aprovado";
    case "CANCELED":
      return "Rejeitado";
    default:
      return "Pendente";
  }
}

// converte a reserva "crua" em um objeto usado no dossiê
function mapReservationToRow(
  r: any,
  currentUserName: string,
): ReservationRow {
  const carModel =
    r.assignedCar?.model ??
    r.car?.model ??
    r.carModel ??
    r.assignedCarModel ??
    r.carName ??
    "—";

  const carPlate =
    r.assignedCar?.plate ??
    r.car?.plate ??
    r.carPlate ??
    r.assignedCarPlate ??
    r.plate ??
    "—";

  const branch =
    r.branch?.name ??
    r.branchName ??
    r.branch ??
    "—";

  const department =
    r.department?.name ??
    r.departmentName ??
    r.department ??
    "—";

  const friendlyCode = makeFriendlyReservationCode(r.id);
  const backendCode = r.code && String(r.code).trim();
  const displayCode =
    backendCode && backendCode.length > 0 ? backendCode : friendlyCode;

  return {
    reservationId: r.id,
    id: displayCode,
    user: currentUserName,
    filial: branch,
    location: branch,
    status: (r.status as ReservationStatus) ?? "PENDING",
    car: carModel,
    plate: carPlate,
    department,
    origin: r.origin ?? "—",
    destination: r.destination ?? "—",
    startAt: r.startAt ?? null,
    endAt: r.endAt ?? null,
  };
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

/**
 * Helpers extras para reduzir o nível de aninhamento de funções
 * (evitar o alerta typescript:S2004 no Sonar).
 */

function getLatestValidation(
  validations: ChecklistSubmission[],
): ChecklistSubmission {
  return validations.reduce((best, curr) => {
    const tb = new Date(best.createdAt).getTime();
    const tc = new Date(curr.createdAt).getTime();
    return tc > tb ? curr : best;
  });
}

async function buildDocsStatusMapForReservations(
  reservations: any[],
): Promise<Record<string, DocStatus | undefined>> {
  const entries = await Promise.all(
    reservations.map(async (r) => {
      // só faz sentido checar docs para reservas aprovadas
      if (r.status !== "APPROVED") {
        return [r.id, undefined] as const;
      }
      try {
        const docs = await listDocumentsByReservation(r.id);
        if (!docs.length) {
          return [r.id, undefined] as const;
        }
        return [r.id, docStatusFromDocuments(docs)] as const;
      } catch {
        return [r.id, undefined] as const;
      }
    }),
  );

  const map: Record<string, DocStatus | undefined> = {};
  for (const [id, st] of entries) {
    map[id] = st;
  }
  return map;
}

async function buildChecklistDecisionMapForReservations(
  reservations: any[],
): Promise<Record<string, ChecklistDecision | undefined>> {
  const entries = await Promise.all(
    reservations.map(async (r) => {
      try {
        const subs: ChecklistSubmission[] =
          await ChecklistsAPI.listReservationSubmissions(r.id);

        const validations = subs.filter(
          (s) => s.kind === "APPROVER_VALIDATION",
        );
        if (!validations.length) {
          return [r.id, null] as const;
        }

        const latest = getLatestValidation(validations);
        const decision = normalizeChecklistDecision(latest as any);
        return [r.id, decision] as const;
      } catch {
        return [r.id, null] as const;
      }
    }),
  );

  const map: Record<string, ChecklistDecision | undefined> = {};
  for (const [id, dec] of entries) {
    map[id] = dec;
  }
  return map;
}

export default function RequesterDashboard() {
  const { user } = useAuth();

  const { myItems, loading, errors, refreshMy, cancelReservation } =
    useReservations();

  // status agregados de documentos por reserva
  const [docStatusMap, setDocStatusMap] = useState<
    Record<string, DocStatus | undefined>
  >({});

  // decisão de checklist por reserva
  const [checklistDecisionMap, setChecklistDecisionMap] = useState<
    Record<string, ChecklistDecision | undefined>
  >({});

  // dossiê
  const [showDossier, setShowDossier] = useState(false);
  const [selected, setSelected] = useState<ReservationRow | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const currentUserName = user?.name ?? "Requester";

  // carrega "minhas reservas" ao montar o dashboard
  useEffect(() => {
    refreshMy();
  }, [refreshMy]);

  // carrega status de documentos (igual página de reservations)
  useEffect(() => {
    const list = myItems ?? [];
    if (!list.length) {
      setDocStatusMap({});
      return;
    }

    buildDocsStatusMapForReservations(list)
      .then(setDocStatusMap)
      .catch(() => {
        setDocStatusMap({});
      });
  }, [myItems]);

  // carrega decisões de checklist (igual página de reservations)
  useEffect(() => {
    const list = myItems ?? [];
    if (!list.length) {
      setChecklistDecisionMap({});
      return;
    }

    buildChecklistDecisionMapForReservations(list)
      .then(setChecklistDecisionMap)
      .catch(() => {
        setChecklistDecisionMap({});
      });
  }, [myItems]);

  // lista filtrada: apenas PENDING, APPROVED e/ou docs rejeitados
  const filtered = useMemo(() => {
    const list = myItems ?? [];

    return list
      .filter((r) => {
        const status = r.status as ReservationStatus;
        const docStatus = docStatusMap[r.id];

        const isPendingOrApproved =
          status === "PENDING" || status === "APPROVED";
        const hasRejectedDocs = docStatus === "PendingDocs";

        return isPendingOrApproved || hasRejectedDocs;
      })
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      )
      .slice(0, 5);
  }, [myItems, docStatusMap]);

  const listError = (errors as any)?.list as string | undefined;

  const openDossier = useCallback((row: ReservationRow) => {
    setSelected(row);
    setShowDossier(true);
  }, []);

  // sem window.confirm: cancela direto usando o hook
  const handleCancel = useCallback(
    async (reservationId: string) => {
      try {
        await cancelReservation(reservationId);
        await refreshMy();
      } catch (err) {
        console.error(err);
        window.alert(
          "Não foi possível cancelar a reserva. Tente novamente mais tarde.",
        );
      }
    },
    [cancelReservation, refreshMy],
  );

  const printDossier = useCallback(() => {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "print");
    if (!win) return;

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
          Welcome back, {user?.name ?? "Requester"}
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

      {/* Tabela de próximas reservas (scroll + status idêntico a My Reservations) */}
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
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Origin
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Destination
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading.my ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-sm text-muted-foreground"
                      >
                        Loading your upcoming reservations...
                      </td>
                    </tr>
                  ) : listError ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-sm text-red-600"
                      >
                        {listError}
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-sm text-muted-foreground"
                      >
                        You don&apos;t have upcoming reservations yet.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const displayRow = mapReservationToRow(
                        r,
                        currentUserName,
                      );

                      const docStatus = docStatusMap[r.id];
                      const checklistDecision = checklistDecisionMap[r.id];

                      const syntheticValidationResult =
                        checklistDecision === "REJECTED" &&
                        (docStatus === "Validated" ||
                          r.status === "COMPLETED")
                          ? "CHECKLIST_REJECTED"
                          : ((r as any).validationResult ?? null);

                      const { badgeStatus, chipLabel, text } =
                        getStatusPresentation(
                          r.status as ReservationStatus,
                          docStatus,
                          syntheticValidationResult,
                        );

                      const canCancel =
                        displayRow.status === "PENDING" ||
                        displayRow.status === "APPROVED";

                      return (
                        <tr
                          key={displayRow.reservationId}
                          className="border-b border-border/50 hover:bg-card/50"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            {displayRow.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {displayRow.origin}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {displayRow.destination}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {displayRow.startAt
                              ? formatDateTime(displayRow.startAt)
                              : "—"}{" "}
                            <ArrowRight className="mx-1 inline h-3 w-3" />
                            {displayRow.endAt
                              ? formatDateTime(displayRow.endAt)
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <ReservationStatusBadge
                              status={badgeStatus}
                              className={statusChipClasses(chipLabel)}
                            >
                              {text}
                            </ReservationStatusBadge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDossier(displayRow)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>

                              {canCancel && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleCancel(displayRow.reservationId)
                                  }
                                  disabled={loading.cancel}
                                >
                                  {loading.cancel ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="mr-2 h-4 w-4" />
                                  )}
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
              <div className="text-sm text-muted-foreground" />
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
                  {user?.email ??
                    (selected
                      ? `${selected.user
                          .toLowerCase()
                          .replace(/\s+/g, ".")}@reservcar.com`
                      : "—")}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Branch</div>
                <div className="text-base font-medium text-foreground">
                  {selected?.filial}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Origin</div>
                <div className="text-base font-medium text-foreground">
                  {selected?.origin}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Destination</div>
                <div className="text-base font-medium text-foreground">
                  {selected?.destination}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Vehicle</div>
                <div className="text-base font-medium text-foreground">
                  {selected?.car} — {selected?.plate}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Department</div>
                <div className="text-base font-medium text-foreground">
                  {selected?.department}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Start</div>
                <div className="text-base font-medium text-foreground">
                  {formatDateTime(selected?.startAt ?? null)}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">End</div>
                <div className="text-base font-medium text-foreground">
                  {formatDateTime(selected?.endAt ?? null)}
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
