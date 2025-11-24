import * as React from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Eye, Loader2, RefreshCcw, AlertCircle } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

import {
  ChecklistsAPI,
  type ChecklistSubmission,
  type ChecklistSubmissionPayloadItem,
} from "@/lib/http/checklists";
import {
  ReservationsAPI,
  type Reservation,
} from "@/lib/http/reservations";
import { makeFriendlyReservationCode } from "@/lib/friendly-reservation-code";

// Tipos locais

type ChecklistRowStatus = "Pending" | "Validated" | "Rejected";

type ChecklistRow = {
  id: string; // reservation id
  reservationId: string;
  displayId: string; // friendly reservation code
  car: string;
  date: string;
  status: ChecklistRowStatus;
};

type ApiReservation = Reservation & {
  code?: string | null;
  car?: {
    model?: string | null;
    plate?: string | null;
  } | null;
};

type StatusFilter = "all" | "pending" | "validated" | "rejected";

// Funções auxiliares

/**
 * Normaliza a decisão de validação a partir de:
 * - submission.decision / submission.result / submission.status
 * - OU payload.decision / payload.result / payload.status
 */
function normalizeDecision(source: any): "APPROVED" | "REJECTED" | null {
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
 * Dos checklists da reserva, calcula o status agregado para o REQUESTER.
 *
 * - Se não houver USER_RETURN → não aparece na tela (retorna null).
 * - Se houver USER_RETURN e NENHUMA validação → "Pending"
 * - Se houver validação com decisão APPROVED → "Validated"
 * - Se houver validação com decisão REJECTED → "Rejected"
 */
function checklistStatusFromSubmissions(
  subs: ChecklistSubmission[],
): ChecklistRowStatus | null {
  const hasUserReturn = subs.some((s) => s.kind === "USER_RETURN");
  if (!hasUserReturn) return null;

  const validations = subs.filter((s) => s.kind === "APPROVER_VALIDATION");
  if (!validations.length) return "Pending";

  // pega a validação mais recente
  const latest = validations.reduce((best, curr) => {
    const tb = new Date(best.createdAt).getTime();
    const tc = new Date(curr.createdAt).getTime();
    return tc > tb ? curr : best;
  });

  const decision = normalizeDecision(latest as any);

  if (decision === "APPROVED") return "Validated";
  if (decision === "REJECTED") return "Rejected";
  return "Pending";
}

function checklistStatusToChip(
  s: ChecklistRowStatus,
): "Pendente" | "Aprovado" | "Rejeitado" {
  if (s === "Validated") return "Aprovado";
  if (s === "Rejected") return "Rejeitado";
  return "Pendente";
}

// Page

export default function RequesterChecklistPage() {
  const { toast } = useToast();

  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  // filtros: Car + Status (igual Documents)
  const [carFilter, setCarFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // seleção atual
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // dados do painel (itens enviados + decisão do aprovador)
  const [items, setItems] = useState<ChecklistSubmissionPayloadItem[]>([]);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(
    null,
  );
  const [approverNotes, setApproverNotes] = useState<string>("");
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  // refs para click-away
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Carregar reservas do usuário
  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    try {
      // Usa o client oficial de reservas do projeto
      const data = await ReservationsAPI.listMine();

      const arr: ApiReservation[] = Array.isArray(data)
        ? (data as ApiReservation[])
        : [];

      const result: ChecklistRow[] = [];

      for (const r of arr) {
        // Não faz sentido mostrar reservas canceladas
        if (r.status === "CANCELED") continue;

        // Só consideramos reservas aprovadas/completadas com carro vinculado
        if (!r.car || (!r.car.model && !r.car.plate)) continue;

        let subs: ChecklistSubmission[] = [];
        try {
          subs = await ChecklistsAPI.listReservationSubmissions(r.id);
        } catch {
          subs = [];
        }

        const status = checklistStatusFromSubmissions(subs);

        // Essa tela só mostra reservas que JÁ têm checklist enviado (USER_RETURN)
        if (!status) continue;

        const carLabel = r.car?.model ?? r.car?.plate ?? "—";

        let date = "—";
        const d = r.startAt ? new Date(r.startAt) : null;
        if (d && !Number.isNaN(d.getTime())) {
          date = d.toLocaleDateString("pt-BR");
        }

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
        title: "Erro ao carregar checklists",
        description: "Não foi possível carregar suas reservas com checklist.",
        variant: "destructive",
      });
    } finally {
      setLoadingRows(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  // Carregar submissões quando a reserva selecionada mudar
  useEffect(() => {
    if (!selectedId) {
      setItems([]);
      setDecision(null);
      setApproverNotes("");
      setPanelError(null);
      return;
    }

    let cancelled = false;

    const loadSubs = async () => {
      setLoadingPanel(true);
      setPanelError(null);
      try {
        const subs = await ChecklistsAPI.listReservationSubmissions(
          selectedId,
        );

        const userReturn = subs.find((s) => s.kind === "USER_RETURN");
        const approver = subs.find(
          (s) => s.kind === "APPROVER_VALIDATION",
        );

        if (
          !userReturn ||
          !userReturn.payload ||
          !Array.isArray(userReturn.payload.items)
        ) {
          if (!cancelled) {
            setItems([]);
            setDecision(null);
            setApproverNotes("");
            setPanelError("Nenhum checklist encontrado para esta reserva.");
          }
          return;
        }

        const payloadItems =
          (userReturn.payload.items as ChecklistSubmissionPayloadItem[]) ?? [];

        if (!cancelled) {
          setItems(payloadItems);
          setDecision(approver ? normalizeDecision(approver as any) : null);
          setApproverNotes(
            approver &&
              approver.payload &&
              typeof approver.payload.notes === "string"
              ? approver.payload.notes
              : "",
          );
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setItems([]);
          setDecision(null);
          setApproverNotes("");
          setPanelError(
            err?.response?.data?.message ??
              err?.message ??
              "Não foi possível carregar o checklist desta reserva.",
          );
        }
      } finally {
        if (!cancelled) setLoadingPanel(false);
      }
    };

    void loadSubs();

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
        (statusFilter === "validated" && r.status === "Validated") ||
        (statusFilter === "rejected" && r.status === "Rejected");

      return byCar && byStatus;
    });
  }, [rows, carFilter, statusFilter]);

  const rowsForTable: ChecklistRow[] =
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

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!selectedId) return;
      const target = e.target as Node;
      const path = (e as any).composedPath?.() as Node[] | undefined;

      const insideList =
        listRef.current &&
        (path?.includes(listRef.current) || listRef.current.contains(target));
      const insidePanel =
        panelRef.current &&
        (path?.includes(panelRef.current) || panelRef.current.contains(target));

      if (!insideList && !insidePanel) {
        setSelectedId("");
      }
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

  const handleRefreshClick = () => {
    void loadRows();
    setSelectedId("");
    setItems([]);
    setDecision(null);
    setApproverNotes("");
    setPanelError(null);
  };

  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Header + filtros (Car e Status) */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">My Checklists</h1>

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
              onValueChange={(v: StatusFilter) => setStatusFilter(v)}
              disabled={loadingRows}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending validation</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    My Checklists
                  </h2>
                  {loadingRows && (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading…
                    </span>
                  )}
                </div>

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
                    {rowsForTable.map((row) => {
                      const isPlaceholder = row.id === "__placeholder__";

                      return (
                        <button
                          key={row.id}
                          type="button"
                          className="w-full px-4 py-3 text-left transition-colors hover:bg-card/60 focus:outline-none"
                          onClick={() => {
                            if (isPlaceholder) return;
                            setSelectedId(row.id);
                          }}
                          disabled={isPlaceholder || loadingRows}
                        >
                          <div className="grid grid-cols-5 items-center gap-4 text-sm">
                            <div className="font-medium text-foreground">
                              {row.displayId}
                            </div>
                            <div className="text-muted-foreground">
                              {row.car}
                            </div>
                            <div className="text-muted-foreground">
                              {row.date}
                            </div>
                            <div>
                              <Badge
                                className={statusChipClasses(
                                  checklistStatusToChip(row.status),
                                )}
                              >
                                {row.status === "Pending"
                                  ? "Pending validation"
                                  : row.status === "Validated"
                                  ? "Validated"
                                  : "Rejected"}
                              </Badge>
                            </div>
                            <div className="flex justify-start">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPlaceholder) return;
                                  setSelectedId(row.id);
                                }}
                                disabled={isPlaceholder || loadingRows}
                              >
                                View
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
                  Checklist Preview
                </CardTitle>
              </CardHeader>

              {selected ? (
                <CardContent className="p-6 space-y-6">
                  {/* cabeçalho + status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-3 w-3 rounded-full bg-muted-foreground/60" />
                      <span className="font-medium">
                        RESERVATION: {selected.displayId}
                      </span>
                    </div>
                    <Badge
                      className={statusChipClasses(
                        checklistStatusToChip(selected.status),
                      )}
                    >
                      {selected.status === "Pending"
                        ? "Pending validation"
                        : selected.status === "Validated"
                        ? "Validated"
                        : "Rejected"}
                    </Badge>
                  </div>

                  {loadingPanel ? (
                    <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading checklist…
                    </div>
                  ) : panelError ? (
                    <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <span>{panelError}</span>
                    </div>
                  ) : items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No checklist data found for this reservation.
                    </p>
                  ) : (
                    <>
                      <div>
                        <h3 className="mb-4 text-base font-medium text-foreground">
                          Checklist items (read-only)
                        </h3>
                        <div className="space-y-3">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center space-x-3 rounded-lg border border-border p-3"
                            >
                              <Checkbox
                                checked={!!item.checked}
                                disabled
                                className="data-[state=checked]:border-[#1558E9] data-[state=checked]:bg-[#1558E9]"
                              />
                              <span className="text-sm text-foreground">
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {decision && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            Approver decision:{" "}
                            <span className="font-medium">
                              {decision === "APPROVED"
                                ? "Approved"
                                : "Rejected"}
                            </span>
                          </p>

                          {decision === "REJECTED" && (
                            <>
                              {approverNotes && (
                                <p>
                                  Reason:{" "}
                                  <span className="font-medium text-foreground">
                                    {approverNotes}
                                  </span>
                                </p>
                              )}
                              <p>
                                The branch administrator will contact you to
                                regularize this return after a rejected
                                checklist.
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              ) : (
                <CardContent className="space-y-4">
                  <div className="h-48 bg-card/50 border border-dashed border-border/50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">
                        Select a reservation to view the checklist
                      </p>
                      <p className="text-xs">
                        Only reservations with a submitted checklist are shown
                        on the left.
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
