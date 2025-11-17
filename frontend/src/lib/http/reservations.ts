import api from "@/lib/http/api";

/** Tipos mínimos usados no front */
export type ReservationStatus =
  | "PENDING"
  | "APPROVED"
  | "CANCELED"
  | "COMPLETED";

export interface Reservation {
  id: string;
  origin: string;
  destination: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  user?: { id: string; name: string; email: string };
  branch?: { id: string; name: string };
  car?: { id: string; plate: string; model: string };
  branchId?: string | null;
  carId?: string | null;
}

export interface ReservationInput {
  origin: string;
  destination: string;
  startAt: string; // ISO
  endAt: string; // ISO
  branchId?: string;
  carId?: string;
  // purpose?: string;
  // notes?: string;
  // passengers?: number;
}

export interface ReservationApproveInput {
  carId: string;
}

/** Alguns endpoints do back podem retornar array OU { items, total, ... }.
 *  Esta função normaliza para sempre entregar um array de Reservation.
 */
function normalizeList(payload: any): Reservation[] {
  if (Array.isArray(payload)) return payload as Reservation[];
  if (payload && Array.isArray(payload.items))
    return payload.items as Reservation[];
  return [];
}

export const ReservationsAPI = {
  /** Minhas reservas (REQUESTER) */
  async listMine(params?: any): Promise<Reservation[]> {
    const { data } = await api.get("/reservations/me", { params });
    return normalizeList(data);
  },

  /** Lista geral (ADMIN/APPROVER) ou para futuros relatórios */
  async list(params?: any): Promise<Reservation[]> {
    const { data } = await api.get("/reservations", { params });
    return normalizeList(data);
  },

  async get(id: string): Promise<Reservation> {
    const { data } = await api.get(`/reservations/${id}`);
    return data as Reservation;
  },

  async create(body: ReservationInput): Promise<Reservation> {
    const { data } = await api.post("/reservations", body);
    return data as Reservation;
  },

  async approve(
    id: string,
    body: ReservationApproveInput,
  ): Promise<Reservation> {
    const { data } = await api.patch(`/reservations/${id}/approve`, body);
    return data as Reservation;
  },

  async cancel(id: string, reason?: string): Promise<Reservation> {
    const { data } = await api.patch(`/reservations/${id}/cancel`, {
      reason: reason ?? "Cancelled by requester via web app",
    });
    return data as Reservation;
  },

  async complete(id: string): Promise<Reservation> {
    const { data } = await api.patch(`/reservations/${id}/complete`, {});
    return data as Reservation;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/reservations/${id}`);
  },
};
