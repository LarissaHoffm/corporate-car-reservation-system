import * as React from "react";
import { useEffect, useMemo, useState } from "react";

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
import { Label } from "@/components/ui/label";
import { Upload, ImageIcon } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { Checkbox } from "@/components/ui/checkbox";
import { statusChipClasses } from "@/components/ui/status";

type Status = "Pendente" | "Aprovado" | "Rejeitado";

interface ChecklistItem {
  id: string;
  reservationId: string;
  carModel: string;
  user: string;
  pickupDate: string;
  returnDate: string;
  status: Status;
  userRole: string;
}

interface RequesterChecklist {
  reservationId: string;
  tires: string;
  fullTank: string;
  damages: string;
  cleaning: string;
  finalMileage1: string;
  finalMileage2: string;
  finalMileage3: string;
  observations: string;
  photos: string[];
}

interface ApproverMarks {
  tires: boolean | null;
  fullTank: boolean | null;
  damages: boolean | null;
  cleaning: boolean | null;
  finalMileage1: boolean | null;
  finalMileage2: boolean | null;
  finalMileage3: boolean | null;
}

interface RejectionInfo {
  reason: string;
  at: string; // ISO timestamp
  by?: string;
}

const INITIAL_ROWS: ChecklistItem[] = [
  {
    id: "1",
    reservationId: "R2023001",
    carModel: "Honda Civic",
    user: "Diana Prince",
    pickupDate: "2023-10-20",
    returnDate: "2023-10-21",
    status: "Pendente",
    userRole: "Requester",
  },
  {
    id: "2",
    reservationId: "R2023002",
    carModel: "Toyota Corolla",
    user: "Bruce Wayne",
    pickupDate: "2023-10-22",
    returnDate: "2023-10-23",
    status: "Pendente",
    userRole: "Requester",
  },
  {
    id: "3",
    reservationId: "R2023003",
    carModel: "Ford Focus",
    user: "Clark Kent",
    pickupDate: "2023-10-24",
    returnDate: "2023-10-24",
    status: "Pendente",
    userRole: "Requester",
  },
  {
    id: "4",
    reservationId: "R2023004",
    carModel: "Tesla Model 3",
    user: "Barry Allen",
    pickupDate: "2023-10-25",
    returnDate: "2023-10-25",
    status: "Aprovado",
    userRole: "Requester",
  },
  {
    id: "5",
    reservationId: "R2023005",
    carModel: "VW Golf",
    user: "Hal Jordan",
    pickupDate: "2023-10-26",
    returnDate: "2023-10-26",
    status: "Rejeitado",
    userRole: "Requester",
  },
  {
    id: "6",
    reservationId: "R2023006",
    carModel: "Chevrolet Onix",
    user: "Peter Parker",
    pickupDate: "2023-10-27",
    returnDate: "2023-10-27",
    status: "Pendente",
    userRole: "Requester",
  },
  {
    id: "7",
    reservationId: "R2023007",
    carModel: "Renault Kwid",
    user: "Natasha Romanoff",
    pickupDate: "2023-10-28",
    returnDate: "2023-10-28",
    status: "Pendente",
    userRole: "Requester",
  },
  {
    id: "8",
    reservationId: "R2023008",
    carModel: "Hyundai HB20",
    user: "Tony Stark",
    pickupDate: "2023-10-29",
    returnDate: "2023-10-29",
    status: "Pendente",
    userRole: "Requester",
  },
];

const STORAGE_KEYS = {
  rows: "approver_checklists_rows",
  requester: "requester_checklists_by_reservation",
  approver: "approver_validations_by_reservation",
  rejections: "rejections_by_reservation",
} as const;

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

function upsertRowsSeed(): ChecklistItem[] {
  const existing = readJSON<ChecklistItem[]>(STORAGE_KEYS.rows);
  if (!existing || !Array.isArray(existing) || existing.length === 0) {
    writeJSON(STORAGE_KEYS.rows, INITIAL_ROWS);
    return INITIAL_ROWS;
  }
  const byReservation = new Map(existing.map((r) => [r.reservationId, r]));
  const toAdd: ChecklistItem[] = [];
  for (const seed of INITIAL_ROWS) {
    if (!byReservation.has(seed.reservationId)) {
      toAdd.push(seed);
    }
  }
  if (toAdd.length) {
    const merged = [...existing, ...toAdd];
    writeJSON(STORAGE_KEYS.rows, merged);
    return merged;
  }
  return existing;
}

function seedRequesterIfEmpty() {
  const cur = readJSON<Record<string, RequesterChecklist>>(
    STORAGE_KEYS.requester,
  );
  if (cur) return;
  const seed: Record<string, RequesterChecklist> = {
    R2023001: {
      reservationId: "R2023001",
      tires: "OK (33 PSI em todos)",
      fullTank: "70%",
      damages: "Risco pequeno no para-choque traseiro",
      cleaning: "Interno OK / Externo com poeira",
      finalMileage1: "45123",
      finalMileage2: "—",
      finalMileage3: "—",
      observations: "Sem alerta no painel. Bluetooth desconecta às vezes.",
      photos: ["photo-1697811123.jpg", "photo-1697811155.jpg"],
    },
    R2023002: {
      reservationId: "R2023002",
      tires: "OK",
      fullTank: "Cheio",
      damages: "Sem danos visíveis",
      cleaning: "Limpo",
      finalMileage1: "12345",
      finalMileage2: "—",
      finalMileage3: "—",
      observations: "",
      photos: [],
    },
    R2023006: {
      reservationId: "R2023006",
      tires: "Pressão 32 PSI",
      fullTank: "Meio tanque",
      damages: "Pequeno amassado na porta direita",
      cleaning: "Interno limpo, externo com poeira",
      finalMileage1: "22010",
      finalMileage2: "—",
      finalMileage3: "—",
      observations: "Sem observações adicionais.",
      photos: [],
    },
    R2023007: {
      reservationId: "R2023007",
      tires: "OK",
      fullTank: "1/4",
      damages: "Risco no para-lama esquerdo",
      cleaning: "Necessita lavagem externa",
      finalMileage1: "9981",
      finalMileage2: "—",
      finalMileage3: "—",
      observations: "Luz de TPMS acendeu brevemente.",
      photos: [],
    },
    R2023008: {
      reservationId: "R2023008",
      tires: "OK",
      fullTank: "Cheio",
      damages: "Nenhum",
      cleaning: "Limpo",
      finalMileage1: "5302",
      finalMileage2: "—",
      finalMileage3: "—",
      observations: "",
      photos: [],
    },
  };
  writeJSON(STORAGE_KEYS.requester, seed);
}

export default function ApproverChecklistsPage() {
  const [rows, setRows] = useState<ChecklistItem[]>(() => upsertRowsSeed());
  const [selected, setSelected] = useState<ChecklistItem | null>(null);

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [rejectReason, setRejectReason] = useState("");

  const [requesterData, setRequesterData] = useState<RequesterChecklist | null>(
    null,
  );
  const [marks, setMarks] = useState<ApproverMarks>({
    tires: null,
    fullTank: null,
    damages: null,
    cleaning: null,
    finalMileage1: null,
    finalMileage2: null,
    finalMileage3: null,
  });
  const [observations, setObservations] = useState<string>("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [readOnlyView, setReadOnlyView] = useState(false);
  const [rejectionInfo, setRejectionInfo] = useState<RejectionInfo | null>(
    null,
  );

  useEffect(() => {
    writeJSON(STORAGE_KEYS.rows, rows);
  }, [rows]);

  useEffect(() => {
    seedRequesterIfEmpty();
  }, []);

  const loadPayloadFor = (reservationId: string) => {
    const requester =
      readJSON<Record<string, RequesterChecklist>>(STORAGE_KEYS.requester) ??
      {};
    setRequesterData(requester[reservationId] ?? null);

    const approver =
      readJSON<
        Record<
          string,
          { marks: ApproverMarks; observations: string; photos: string[] }
        >
      >(STORAGE_KEYS.approver) ?? {};
    const data = approver[reservationId];
    if (data) {
      setMarks(data.marks);
      setObservations(data.observations ?? "");
      setPhotos(data.photos ?? []);
    } else {
      setMarks({
        tires: null,
        fullTank: null,
        damages: null,
        cleaning: null,
        finalMileage1: null,
        finalMileage2: null,
        finalMileage3: null,
      });
      setObservations("");
      setPhotos([]);
    }

    const rejections =
      readJSON<Record<string, RejectionInfo>>(STORAGE_KEYS.rejections) ?? {};
    setRejectionInfo(rejections[reservationId] ?? null);
  };

  const saveApproverPayload = (
    reservationId: string,
    payload: { marks: ApproverMarks; observations: string; photos: string[] },
  ) => {
    const cur =
      readJSON<
        Record<
          string,
          { marks: ApproverMarks; observations: string; photos: string[] }
        >
      >(STORAGE_KEYS.approver) ?? {};
    cur[reservationId] = payload;
    writeJSON(STORAGE_KEYS.approver, cur);
  };

  const saveRejectionInfo = (reservationId: string, info: RejectionInfo) => {
    const cur =
      readJSON<Record<string, RejectionInfo>>(STORAGE_KEYS.rejections) ?? {};
    cur[reservationId] = info;
    writeJSON(STORAGE_KEYS.rejections, cur);
  };

  const handleValidateChecklist = (row: ChecklistItem) => {
    setSelected(row);
    setReadOnlyView(false);
    loadPayloadFor(row.reservationId);
    setShowValidationModal(true);
  };

  const handleViewChecklist = (row: ChecklistItem) => {
    setSelected(row);
    setReadOnlyView(true);
    loadPayloadFor(row.reservationId);
    setShowValidationModal(true);
  };

  const handleRejectChecklist = (row: ChecklistItem) => {
    setSelected(row);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmValidation = () => {
    if (!selected) return;
    saveApproverPayload(selected.reservationId, {
      marks,
      observations,
      photos,
    });
    setRows((prev) =>
      prev.map((r) =>
        r.id === selected.id ? { ...r, status: "Aprovado" } : r,
      ),
    );
    setShowValidationModal(false);
    setSelected(null);
  };

  const handleSubmitRejection = () => {
    if (!selected) return;
    saveRejectionInfo(selected.reservationId, {
      reason: rejectReason.trim(),
      at: new Date().toISOString(),
      by: undefined,
    });
    setRows((prev) =>
      prev.map((r) =>
        r.id === selected.id ? { ...r, status: "Rejeitado" } : r,
      ),
    );
    setShowRejectModal(false);
    setShowValidationModal(false);
    setSelected(null);
    setRejectReason("");
  };

  const handleAddImage = () => {
    const newPhoto = `photo-${Date.now()}.jpg`;
    setPhotos((prev) => [...prev, newPhoto]);
  };

  const ChecklistRow = ({
    label,
    userValue,
    markKey,
  }: {
    label: string;
    userValue?: string;
    markKey: keyof ApproverMarks;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] items-center gap-3">
      <Label className="text-sm text-gray-700">{label}</Label>
      {/* Valor do Requester (texto simples) */}
      <div className="mt-1 text-sm text-foreground bg-muted/20 rounded px-3 py-2">
        {userValue ?? "—"}
      </div>
      {/* Marcação do Approver */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={marks[markKey] === true}
          onCheckedChange={(v) =>
            setMarks((prev) => ({ ...prev, [markKey]: Boolean(v) }))
          }
          disabled={readOnlyView}
          className="border-muted-foreground"
        />
        <span className="text-sm text-muted-foreground">OK</span>
      </div>
    </div>
  );

  const headerSubtitle = useMemo(
    () =>
      readOnlyView
        ? "Checklist enviado pelo usuário"
        : "Validação de devolução do veículo",
    [readOnlyView],
  );

  return (
    <RoleGuard allowedRoles={["APPROVER"]} requireAuth={false}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Checklist Pendentes
          </h1>
          <p className="text-muted-foreground mt-1">
            Validate the return checklist submitted by users.
          </p>
        </div>

        {/* Tabela */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card/50 border-b border-border/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      RESERVATION ID
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
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={
                        index !== rows.length - 1
                          ? "border-b border-border/50"
                          : ""
                      }
                    >
                      <td className="py-3 px-4 text-foreground font-medium">
                        {row.reservationId}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {row.carModel}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {row.user}
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
                              onClick={() => handleValidateChecklist(row)}
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
                              onClick={() => handleRejectChecklist(row)}
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

              {/* Status chip no cabeçalho */}
              {selected && (
                <Badge className={statusChipClasses(selected.status)}>
                  {selected.status}
                </Badge>
              )}
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Reservation #{selected?.reservationId} — {selected?.carModel}
                </h2>
              </div>

              {rejectionInfo && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <div className="font-medium mb-1">Last rejection</div>
                  <div className="mb-1">{rejectionInfo.reason}</div>
                  <div className="text-xs opacity-80">
                    {new Date(rejectionInfo.at).toLocaleString()}
                    {rejectionInfo.by ? ` • by ${rejectionInfo.by}` : ""}
                  </div>
                </div>
              )}

              {/* Linhas do checklist */}
              <div className="space-y-3">
                <ChecklistRow
                  label="Tires"
                  userValue={requesterData?.tires}
                  markKey="tires"
                />
                <ChecklistRow
                  label="Full Tank"
                  userValue={requesterData?.fullTank}
                  markKey="fullTank"
                />
                <ChecklistRow
                  label="Damages"
                  userValue={requesterData?.damages}
                  markKey="damages"
                />
                <ChecklistRow
                  label="Cleaning"
                  userValue={requesterData?.cleaning}
                  markKey="cleaning"
                />
                <ChecklistRow
                  label="Final Mileage"
                  userValue={requesterData?.finalMileage1}
                  markKey="finalMileage1"
                />
                <ChecklistRow
                  label="Final Mileage"
                  userValue={requesterData?.finalMileage2}
                  markKey="finalMileage2"
                />
                <ChecklistRow
                  label="Final Mileage"
                  userValue={requesterData?.finalMileage3}
                  markKey="finalMileage3"
                />
              </div>

              {/* Observations + Photos aparecem APENAS no fluxo de Aprovar */}
              {!readOnlyView && (
                <>
                  <div>
                    <h3 className="text-base font-medium text-foreground mb-2">
                      Observations
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Notes from the approver about the return condition.
                    </p>
                    <Textarea
                      value={observations}
                      onChange={(e) => setObservations(e.currentTarget.value)}
                      className="min-h-[100px]"
                      placeholder="Write any notes about the return condition..."
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-medium text-foreground mb-3">
                      Photos
                    </h3>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-card/50">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag & drop photos here
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleAddImage}
                        className="border-border text-gray-700 hover:bg-card bg-transparent"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Add Image
                      </Button>
                    </div>

                    {requesterData?.photos?.length || photos.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {requesterData?.photos?.map((p, i) => (
                          <div
                            key={`r-${i}`}
                            className="bg-card px-3 py-1 rounded text-sm text-gray-700"
                          >
                            Requester: {p}
                          </div>
                        ))}
                        {photos.map((p, i) => (
                          <div
                            key={`a-${i}`}
                            className="bg-card px-3 py-1 rounded text-sm text-gray-700"
                          >
                            Approver: {p}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}

              {/* Ações do modal */}
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
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={handleConfirmValidation}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Confirm Validation
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
                Provide a brief reason (opcional) para rastreabilidade:
              </div>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.currentTarget.value)}
                placeholder="Describe the issue found during return..."
                className="w-full rounded-md border border-border/50 bg-background p-2 min-h-[100px] text-sm"
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  className="border-border text-gray-700 hover:bg-card"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRejection}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={!rejectReason.trim()}
                >
                  Submit Rejection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
