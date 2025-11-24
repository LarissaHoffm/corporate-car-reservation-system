import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/components/role-guard";
import { Checkbox } from "@/components/ui/checkbox";
import { statusChipClasses } from "@/components/ui/status";
import { useToast } from "@/components/ui/use-toast";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { RefreshCcw } from "lucide-react";

import {
  ChecklistsAPI,
  type ChecklistSubmissionPayloadItem,
} from "@/lib/http/checklists";
import { makeFriendlyReservationCode } from "@/lib/friendly-reservation-code";

type Status = "Pendente" | "Aprovado" | "Rejeitado";
type StatusFilter = "Todos" | Status;

interface ChecklistRow {
  reservationId: string;      // ID real (UUID)
  reservationCode: string;    // ID amigável (RES-XXXX ou code)
  carModel: string;
  userName: string;
  pickupDate: string;
  returnDate: string;
  status: Status;
}

const mapApiStatusToRowStatus = (
  apiStatus: string | null | undefined,
): Status => {
  const s = (apiStatus ?? "").toUpperCase();

  if (s === "VALIDATED" || s === "APPROVED") {
    return "Aprovado";
  }
  if (s === "REJECTED") {
    return "Rejeitado";
  }
  return "Pendente";
};

export default function ApproverChecklistsPage() {
  const { toast } = useToast();

  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const [selected, setSelected] = useState<ChecklistRow | null>(null);

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [rejectReason, setRejectReason] = useState("");

  const [userItems, setUserItems] = useState<ChecklistSubmissionPayloadItem[]>(
    [],
  );
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(
    null,
  );
  const [observations, setObservations] = useState<string>("");

  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [readOnlyView, setReadOnlyView] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");

  // Carregar pendências / histórico do APPROVER
  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    try {
      const pending = await ChecklistsAPI.listPendingForApprover();

      const mapped: ChecklistRow[] = (pending ?? []).map((r) => {
        const carLabel = r.car?.model ?? (r.car?.plate ? r.car.plate : "—");

        const pickupDate =
          r.startAt && !Number.isNaN(new Date(r.startAt).getTime())
            ? new Date(r.startAt).toLocaleDateString("pt-BR")
            : "—";

        const returnDate =
          r.endAt && !Number.isNaN(new Date(r.endAt).getTime())
            ? new Date(r.endAt).toLocaleDateString("pt-BR")
            : "—";

        return {
          reservationId: r.id,
          reservationCode: makeFriendlyReservationCode({
            id: r.id,
            code: (r as any).code ?? null,
          }),
          carModel: carLabel,
          userName: r.requester?.name ?? r.requester?.email ?? "—",
          pickupDate,
          returnDate,
          status: mapApiStatusToRowStatus(r.status),
        };
      });

      setRows(mapped);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao carregar checklists",
        description:
          "Não foi possível carregar as reservas com checklist pendente.",
        variant: "destructive",
      });
    } finally {
      setLoadingRows(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "Todos") return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  // Carregar checklist enviado pelo requester
  async function loadChecklistForReservation(reservationId: string) {
    setLoadingChecklist(true);
    setUserItems([]);
    setCurrentTemplateId(null);
    setObservations("");

    try {
      const submissions = await ChecklistsAPI.listReservationSubmissions(
        reservationId,
      );

      const userReturn = submissions.find((s) => s.kind === "USER_RETURN");

      if (!userReturn) {
        toast({
          title: "Checklist não encontrado",
          description:
            "Nenhum checklist de devolução foi encontrado para esta reserva.",
          variant: "destructive",
        });
        return;
      }

      const items =
        (userReturn.payload?.items as ChecklistSubmissionPayloadItem[]) ?? [];

      setUserItems(items);
      setCurrentTemplateId(userReturn.templateId ?? null);

      const approverValidation = submissions.find(
        (s) => s.kind === "APPROVER_VALIDATION",
      );
      if (approverValidation && approverValidation.payload) {
        setObservations(approverValidation.payload.notes ?? "");
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao carregar checklist",
        description:
          "Não foi possível carregar o checklist desta reserva.",
        variant: "destructive",
      });
    } finally {
      setLoadingChecklist(false);
    }
  }

  // Handlers rows
  const handleValidateChecklist = (row: ChecklistRow) => {
    setSelected(row);
    setReadOnlyView(false);
    setShowValidationModal(true);
    void loadChecklistForReservation(row.reservationId);
  };

  const handleViewChecklist = (row: ChecklistRow) => {
    setSelected(row);
    setReadOnlyView(true);
    setShowValidationModal(true);
    void loadChecklistForReservation(row.reservationId);
  };

  const handleRejectChecklist = (row: ChecklistRow) => {
    setSelected(row);
    setRejectReason("");
    setShowRejectModal(true);
    void loadChecklistForReservation(row.reservationId);
  };

  // Confirmar aprovação
  const handleConfirmValidation = async () => {
    if (!selected || !currentTemplateId) {
      toast({
        title: "Checklist incompleto",
        description:
          "Não foi possível identificar o template do checklist. Recarregue a página e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      await ChecklistsAPI.submitApproverValidation(
        selected.reservationId,
        currentTemplateId,
        "APPROVED",
        {
          items: userItems,
          notes: observations || undefined,
        },
      );

      toast({
        title: "Checklist aprovado",
        description:
          "A devolução do veículo foi validada com sucesso.",
      });

      setRows((prev) =>
        prev.map((row) =>
          row.reservationId === selected.reservationId
            ? { ...row, status: "Aprovado" as Status }
            : row,
        ),
      );

      setShowValidationModal(false);
      setSelected(null);
      setUserItems([]);
      setObservations("");
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao aprovar checklist",
        description:
          "Não foi possível registrar a validação. Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmar rejeição
  const handleSubmitRejection = async () => {
    if (!selected || !currentTemplateId) {
      toast({
        title: "Checklist incompleto",
        description:
          "Não foi possível identificar o template do checklist. Recarregue a página e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      await ChecklistsAPI.submitApproverValidation(
        selected.reservationId,
        currentTemplateId,
        "REJECTED",
        {
          items: userItems,
          notes: rejectReason.trim(),
        },
      );

      toast({
        title: "Checklist rejeitado",
        description:
          "A devolução foi rejeitada e o solicitante poderá acompanhar o motivo na área de checklists.",
      });

      setRows((prev) =>
        prev.map((row) =>
          row.reservationId === selected.reservationId
            ? { ...row, status: "Rejeitado" as Status }
            : row,
        ),
      );

      setShowRejectModal(false);
      setShowValidationModal(false);
      setSelected(null);
      setRejectReason("");
      setUserItems([]);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao rejeitar checklist",
        description:
          "Não foi possível registrar a rejeição. Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Auxiliares
  const headerSubtitle = useMemo(
    () =>
      readOnlyView
        ? "Checklist enviado pelo usuário"
        : "Validação de devolução do veículo",
    [readOnlyView],
  );

  const hasRows = filteredRows.length > 0;

  return (
    <RoleGuard allowedRoles={["APPROVER"]} requireAuth={false}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Checklist Pendentes
            </h1>
            <p className="text-muted-foreground mt-1">
              Valide os checklists de devolução enviados pelos usuários.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as StatusFilter)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => void loadRows()}
              disabled={loadingRows}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              {loadingRows ? "Carregando…" : "Atualizar"}
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <Card className="border-border/50 shadow-sm flex flex-col min-h-[420px] max-h-[calc(100vh-260px)]">
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full">
                <thead className="bg-card/50 border-b border-border/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      RESERVATION
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      CAR MODEL
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      USER
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      PICK-UP DATE
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      RETURN DATE
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      STATUS
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRows ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 px-4 text-sm text-muted-foreground text-center"
                      >
                        Carregando checklists…
                      </td>
                    </tr>
                  ) : !hasRows ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 px-4 text-sm text-muted-foreground text-center"
                      >
                        Nenhum checklist encontrado para o filtro atual.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, index) => (
                      <tr
                        key={row.reservationId}
                        className={
                          index !== filteredRows.length - 1
                            ? "border-b border-border/50"
                            : ""
                        }
                      >
                        <td className="py-3 px-4 text-foreground font-medium">
                          {row.reservationCode}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {row.carModel}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {row.userName}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {row.pickupDate}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {row.returnDate}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={statusChipClasses(row.status)}>
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-2">
                            {row.status === "Pendente" && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() =>
                                  handleValidateChecklist(row)
                                }
                              >
                                Approve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border text-gray-700 hover:bg-card bg-transparent"
                              onClick={() => handleViewChecklist(row)}
                            >
                              View
                            </Button>
                            {row.status === "Pendente" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  handleRejectChecklist(row)
                                }
                              >
                                Reject
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Validação / Visualização */}
        <Dialog
          open={showValidationModal}
          onOpenChange={setShowValidationModal}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Checklist
                </DialogTitle>
                <div className="text-sm text-muted-foreground">
                  {headerSubtitle}
                </div>
              </div>

              {selected && (
                <Badge className={statusChipClasses(selected.status)}>
                  {selected.status}
                </Badge>
              )}
            </DialogHeader>

            <div className="space-y-6">
              {selected && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    Reservation {selected.reservationCode} —{" "}
                    {selected.carModel}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.userName} • {selected.pickupDate} →{" "}
                    {selected.returnDate}
                  </p>
                </div>
              )}

              {loadingChecklist ? (
                <div className="py-6 text-sm text-muted-foreground">
                  Loading checklist…
                </div>
              ) : userItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No checklist submitted by the requester for this
                  reservation.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {userItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-3 rounded-lg border border-border p-3"
                      >
                        <Checkbox
                          checked={item.checked}
                          disabled
                          className="data-[state=checked]:border-[#1558E9] data-[state=checked]:bg-[#1558E9]"
                        />
                        <span className="text-sm text-foreground">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {observations && (
                    <div>
                      <h3 className="text-base font-medium text-foreground mb-2">
                        Approver notes
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {observations}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                {readOnlyView ? (
                  <Button
                    variant="outline"
                    className="border-border text-gray-700 hover:bg-card"
                    onClick={() => setShowValidationModal(false)}
                  >
                    Close
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() =>
                        selected && handleRejectChecklist(selected)
                      }
                      disabled={
                        submitting ||
                        loadingChecklist ||
                        !userItems.length ||
                        !currentTemplateId
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={handleConfirmValidation}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={
                        submitting ||
                        loadingChecklist ||
                        !userItems.length ||
                        !currentTemplateId
                      }
                    >
                      {submitting ? "Saving…" : "Confirm Validation"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Rejeição */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="max-w-md">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-foreground">
                Reject Return Validation
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Provide a brief reason for traceability:
              </div>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Describe the issue found during return..."
                className="w-full rounded-md border border-border/50 bg-background p-2 min-h-[100px] text-sm"
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  className="border-border text-gray-700 hover:bg-card"
                  onClick={() => setShowRejectModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRejection}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={submitting || !rejectReason.trim()}
                >
                  {submitting ? "Sending…" : "Submit Rejection"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
