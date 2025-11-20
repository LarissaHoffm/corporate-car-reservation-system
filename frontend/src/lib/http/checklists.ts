import { api } from "@/lib/http/api";

export type ChecklistItemType =
  | "BOOLEAN"
  | "NUMBER"
  | "TEXT"
  | "SELECT"
  | "PHOTO";

export interface ChecklistTemplateItem {
  id: string;
  label: string;
  type: ChecklistItemType;
  required: boolean;
  order: number;
  options: any;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  active: boolean;
  carId: string | null;
  createdAt: string;
  updatedAt: string;
  items: ChecklistTemplateItem[];
  car: {
    id: string;
    plate: string;
    model: string;
  } | null;
}

export interface ChecklistSubmissionPayloadItem {
  id: string;
  label: string;
  checked: boolean;
}

export type ChecklistSubmissionKind =
  | "USER_RETURN"
  | "APPROVER_VALIDATION";

export interface ChecklistSubmissionInput {
  templateId: string;
  kind: ChecklistSubmissionKind;
  payload: {
    items: ChecklistSubmissionPayloadItem[];
  };
}

export interface ChecklistSubmission {
  id: string;
  reservationId: string;
  templateId: string;
  submittedById: string;
  kind: ChecklistSubmissionKind;
  payload: any;
  createdAt: string;
}

export type ChecklistDecision = "PENDING" | "APPROVED" | "REJECTED";

export interface PendingChecklistReservation {
  id: string;
  origin: string;
  destination: string;
  startAt: string;
  endAt: string;
  /** Status da reserva (PENDING, APPROVED, COMPLETED, etc.) */
  status: string;
  /** Status agregado do checklist (USER_RETURN + APPROVER_VALIDATION) */
  checklistStatus?: ChecklistDecision;
  requester: {
    id: string;
    name: string;
    email: string;
  };
  car: {
    id: string;
    plate: string;
    model: string;
  } | null;
}

export const ChecklistsAPI = {
  async getTemplateForReservation(
    reservationId: string,
  ): Promise<ChecklistTemplate | null> {
    const { data } = await api.get(
      `/checklists/reservations/${reservationId}/template`,
    );
    return (data ?? null) as ChecklistTemplate | null;
  },

  async submitUserReturn(
    reservationId: string,
    template: ChecklistTemplate,
    answers: Record<string, boolean>,
  ): Promise<void> {
    const itemsPayload: ChecklistSubmissionPayloadItem[] = template.items.map(
      (item) => ({
        id: item.id,
        label: item.label,
        checked: !!answers[item.id],
      }),
    );

    const body: ChecklistSubmissionInput = {
      templateId: template.id,
      kind: "USER_RETURN",
      payload: {
        items: itemsPayload,
      },
    };

    await api.post(
      `/checklists/reservations/${reservationId}/submissions`,
      body,
    );
  },

  /** Todas as submissões de checklist de uma reserva (USER_RETURN + APPROVER_VALIDATION) */
  async listReservationSubmissions(
    reservationId: string,
  ): Promise<ChecklistSubmission[]> {
    const { data } = await api.get(
      `/checklists/reservations/${reservationId}/submissions`,
    );
    if (!data) return [];
    if (Array.isArray(data)) return data as ChecklistSubmission[];
    if (Array.isArray((data as any).items)) {
      return (data as any).items as ChecklistSubmission[];
    }
    return [];
  },

  /** Submissão da validação do APPROVER (aprovar/rejeitar devolução) */
  async submitApproverValidation(
    reservationId: string,
    templateId: string,
    decision: "APPROVED" | "REJECTED",
    payload?: {
      items?: ChecklistSubmissionPayloadItem[];
      notes?: string;
      photos?: string[];
    },
  ): Promise<void> {
    const basePayload = {
      items: payload?.items ?? [],
      notes: payload?.notes,
      photos: payload?.photos ?? [],
    };

    const body: ChecklistSubmissionInput & {
      decision: "APPROVED" | "REJECTED";
    } = {
      templateId,
      kind: "APPROVER_VALIDATION",
      payload: basePayload,
      decision,
    };

    await api.post(
      `/checklists/reservations/${reservationId}/submissions`,
      body,
    );
  },

  /**
   * Reservas que têm USER_RETURN enviado; o backend já agrega o
   * checklistStatus (PENDING | APPROVED | REJECTED).
   */
  async listPendingForApprover(): Promise<PendingChecklistReservation[]> {
    const { data } = await api.get("/checklists/pending");
    if (!data) return [];
    if (Array.isArray(data)) return data as PendingChecklistReservation[];
    if (Array.isArray((data as any).items)) {
      return (data as any).items as PendingChecklistReservation[];
    }
    return [];
  },
};
