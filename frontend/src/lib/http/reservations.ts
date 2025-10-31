// src/lib/http/reservations.ts
import { api } from "./api";

/** Status possíveis conforme fluxo RF09–RF11 */
export type ReservationStatus = "PENDING" | "APPROVED" | "CANCELLED" | "COMPLETED";

/** Objeto principal retornado pela API */
export type Reservation = {
  id: string;
  tenantId: string;
  userId: string;
  carId?: string | null;
  branchId?: string | null;

  origin: string;
  destination: string;

  startAt: string; // ISO
  endAt: string;   // ISO

  status: ReservationStatus;

  createdAt: string; // ISO
  updatedAt: string; // ISO

  // campos adicionais que o backend possa expor
  notes?: string | null;
};

/** Payload para criar/atualizar (mínimo para RF09) */
export type ReservationInput = {
  origin: string;
  destination: string;
  startAt: string; // ISO
  endAt: string;   // ISO
  carId?: string;
  branchId?: string;
  notes?: string;
};

/** Filtros de listagem */
export type QueryReservations = {
  q?: string;
  status?: ReservationStatus | "ALL";
  from?: string; // ISO date
  to?: string;   // ISO date
  userId?: string;
  carId?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
};

export type Paginated<T> = {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
  // alguns serviços nossos retornam também `data`; tratamos ambos
  data?: T[];
};

const base = "/reservations";

/* ----------------------------- Listagens ----------------------------- */

/** Todas as reservas (ADMIN/APPROVER) */
export async function list(params: QueryReservations = {}) {
  const { data } = await api.get<Paginated<Reservation>>(base, { params });
  // normaliza items/data
  if (Array.isArray((data as any).data) && !data.items) {
    (data as any).items = (data as any).data;
  }
  return data;
}

/** Minhas reservas (REQUESTER) */
export async function listMine(params: Omit<QueryReservations, "userId"> = {}) {
  const { data } = await api.get<Paginated<Reservation>>(`${base}/me`, { params });
  if (Array.isArray((data as any).data) && !data.items) {
    (data as any).items = (data as any).data;
  }
  return data;
}

/* ------------------------------ CRUD/Ações ------------------------------ */

export async function getById(id: string) {
  const { data } = await api.get<Reservation>(`${base}/${id}`);
  return data;
}

export async function create(body: ReservationInput) {
  const { data } = await api.post<Reservation>(base, body);
  return data;
}

export async function approve(id: string) {
  const { data } = await api.patch<Reservation>(`${base}/${id}/approve`, {});
  return data;
}

export async function cancel(id: string) {
  const { data } = await api.patch<Reservation>(`${base}/${id}/cancel`, {});
  return data;
}

export async function remove(id: string) {
  const { data } = await api.delete<{ ok: true }>(`${base}/${id}`);
  return data;
}

/* ------------------------------ Export default ------------------------------ */

const ReservationsAPI = {
  list,
  listMine,
  getById,
  create,
  approve,
  cancel,
  remove,
};

export default ReservationsAPI;
