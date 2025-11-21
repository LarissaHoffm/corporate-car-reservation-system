import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { statusChipClasses } from "@/components/ui/status";
import { ReservationStatusBadge } from "@/components/reservation-status-badge";

import {
  ArrowRight,
  Eye,
  Loader2,
  RefreshCcw,
  XCircle,
  CheckCircle2,
} from "lucide-react";

import useReservations from "@/hooks/use-reservations";
import {
  listDocumentsByReservation,
  type Document as ApiDocument,
} from "@/lib/http/documents";
import {
  ChecklistsAPI,
  type ChecklistSubmission,
} from "@/lib/http/checklists";

type QuickRange = "TODAY" | "7D" | "30D" | "ALL";

// Status agregados de documentos
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
 * Mesma regra do backend:
 * - Agrupa por `type`
 * - Considera SÓ o documento mais recente de cada tipo
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

function toDateInputValue(d: Date) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
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


export default function RequesterReservationsListPage() {
  const navigate = useNavigate();
  const { myItems, loading, errors, refreshMy, cancelReservation } =
    useReservations();

  const [q, setQ] = useState("");
  const [range, setRange] = useState<QuickRange>("ALL");
  const [status, setStatus] = useState<
    "ALL" | "PENDING" | "APPROVED" | "CANCELED" | "COMPLETED"
  >("ALL");

  // Mapa reservaId -> status de documentos
  const [docStatusMap, setDocStatusMap] = useState<
    Record<string, DocStatus | undefined>
  >({});

  // Mapa reservaId -> decisão do checklist (APPROVED / REJECTED)
  const [checklistDecisionMap, setChecklistDecisionMap] = useState<
    Record<string, ChecklistDecision | undefined>
  >({});

  useEffect(() => {
    refreshMy();
  }, [refreshMy]);

  // Carrega o status de documentos para as reservas aprovadas
  useEffect(() => {
    const loadDocsStatus = async () => {
      const list = myItems ?? [];
      if (!list.length) {
        setDocStatusMap({});
        return;
      }

      const entries = await Promise.all(
        list.map(async (r) => {
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
      setDocStatusMap(map);
    };

    void loadDocsStatus();
  }, [myItems]);

  // Carrega decisão do checklist (última validação do approver) por reserva
  useEffect(() => {
    const loadChecklistDecisions = async () => {
      const list = myItems ?? [];
      if (!list.length) {
        setChecklistDecisionMap({});
        return;
      }

      const entries = await Promise.all(
        list.map(async (r) => {
          try {
            const subs: ChecklistSubmission[] =
              await ChecklistsAPI.listReservationSubmissions(r.id);

            const validations = subs.filter(
              (s) => s.kind === "APPROVER_VALIDATION",
            );
            if (!validations.length) {
              return [r.id, null] as const;
            }

            const latest = validations.reduce((best, curr) => {
              const tb = new Date(best.createdAt).getTime();
              const tc = new Date(curr.createdAt).getTime();
              return tc > tb ? curr : best;
            });

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
      setChecklistDecisionMap(map);
    };

    void loadChecklistDecisions();
  }, [myItems]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startLimit =
      range === "TODAY"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : range === "7D"
        ? new Date(now.getTime() - 7 * 24 * 3600 * 1000)
        : range === "30D"
        ? new Date(now.getTime() - 30 * 24 * 3600 * 1000)
        : null;

    return (myItems ?? [])
      .filter((r) => {
        if (status !== "ALL" && r.status !== status) return false;

        if (q) {
          const t = q.toLowerCase();
          if (
            !(
              r.origin?.toLowerCase().includes(t) ||
              r.destination?.toLowerCase().includes(t)
            )
          ) {
            return false;
          }
        }

        if (startLimit) {
          const st = new Date(r.startAt);
          if (st < startLimit) return false;
        }

        return true;
      })
      .sort(
        (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
      );
  }, [myItems, q, status, range]);

  async function onCancel(id: string) {
    await cancelReservation(id);
    await refreshMy();
  }

  function onConclude(id: string) {
    // Fluxo: lista -> detalhes -> upload -> checklist
    navigate(`/requester/reservations/${id}`);
  }

  // Mapeia status de reserva + docs + (opcional) resultado de validação
  function getStatusPresentation(
    reservationStatus: "PENDING" | "APPROVED" | "CANCELED" | "COMPLETED",
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

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Reservations</h1>
          <p className="text-sm text-muted-foreground">
            View and manage your recent requests.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshMy} variant="outline">
            {loading.my ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            onClick={() => navigate("/requester/reservations/new")}
            className="bg-[#1558E9] hover:bg-[#1558E9]/90"
          >
            New Reservation
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Search</Label>
            <Input
              placeholder="Origin or destination…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <Select
              value={range}
              onValueChange={(v: QuickRange) => setRange(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAY">Today</SelectItem>
                <SelectItem value="7D">Last 7 days</SelectItem>
                <SelectItem value="30D">Last 30 days</SelectItem>
                <SelectItem value="ALL">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Results ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading.my ? (
            <div className="py-10 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-sm text-muted-foreground">
              No reservations found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="px-4 py-3 text-left">Origin</th>
                      <th className="px-4 py-3 text-left">Destination</th>
                      <th className="px-4 py-3 text-left">Period</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const docStatus = docStatusMap[r.id];
                      const hasDocs = docStatus !== undefined;

                      const checklistDecision = checklistDecisionMap[r.id];

                      const syntheticValidationResult =
                        checklistDecision === "REJECTED" &&
                        (docStatus === "Validated" ||
                          r.status === "COMPLETED")
                          ? "CHECKLIST_REJECTED"
                          : ((r as any).validationResult ?? null);

                      const { badgeStatus, chipLabel, text } =
                        getStatusPresentation(
                          r.status,
                          docStatus,
                          syntheticValidationResult,
                        );

                      const canConclude =
                        r.status === "APPROVED" && !hasDocs;

                      return (
                        <tr
                          key={r.id}
                          className="border-b border-border/50 hover:bg-background"
                        >
                          <td className="px-4 py-3">{r.origin}</td>
                          <td className="px-4 py-3">{r.destination}</td>
                          <td className="px-4 py-3">
                            {new Date(r.startAt).toLocaleString()}{" "}
                            <ArrowRight className="mx-1 inline h-3 w-3" />
                            {new Date(r.endAt).toLocaleString()}
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
                              <Link to={`/requester/reservations/${r.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="mr-2 h-4 w-4" /> Details
                                </Button>
                              </Link>

                              {canConclude && (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => onConclude(r.id)}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Conclude
                                </Button>
                              )}

                              {(r.status === "PENDING" ||
                                r.status === "APPROVED") && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => onCancel(r.id)}
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
                    })}
                  </tbody>
                </table>
              </div>

              {errors.list && (
                <p className="mt-3 text-xs text-red-600">{errors.list}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Today: {toDateInputValue(new Date())}
      </p>
    </div>
  );
}

