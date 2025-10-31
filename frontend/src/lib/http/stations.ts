// frontend/src/lib/http/stations.ts
import { api } from "@/lib/http/api";

/** Types **/
export type StationId = string;

export type StationOrderBy = "name" | "city" | "createdAt";
export type OrderDirection = "asc" | "desc";

export interface Station {
  id: string;
  tenantId?: string;
  branchId?: string | null;
  name: string;
  city?: string;
  state?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
}

export interface StationInput {
  branchId?: string | null;
  name: string;
  city?: string;
  state?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
}

export interface StationListParams {
  page?: number;        // default 1
  pageSize?: number;    // default 10
  q?: string;           // busca livre (nome/cidade)
  city?: string;
  branchId?: string;
  isActive?: boolean;
  orderBy?: StationOrderBy;
  order?: OrderDirection;
}

export interface StationListResponse {
  data: Station[];
  total: number;
  page: number;
  pageSize: number;
}

/** Helpers robustos para normalizar qualquer shape de resposta **/
function extractArray(raw: any): Station[] | null {
  if (Array.isArray(raw)) return raw as Station[];
  if (raw && Array.isArray(raw.data)) return raw.data as Station[];
  if (raw && Array.isArray(raw.items)) return raw.items as Station[];

  if (raw && typeof raw === "object") {
    for (const k of Object.keys(raw)) {
      if (Array.isArray(raw[k])) return raw[k] as Station[];
    }
  }
  return null;
}

function normalizeList(raw: any, params: StationListParams): StationListResponse {
  const arr = extractArray(raw);
  if (arr) {
    const total = Number(
      (raw && (raw.total ?? raw.count ?? raw.length)) ?? arr.length
    );
    const page = Number((raw && raw.page) ?? params.page ?? 1);
    const pageSize = Number((raw && raw.pageSize) ?? params.pageSize ?? arr.length);
    return { data: arr, total, page, pageSize };
  }
  // Fallback defensivo
  return { data: [], total: 0, page: 1, pageSize: params.pageSize ?? 10 };
}

/** API **/
export const StationsAPI = {
  async list(params: StationListParams = {}) {
    const res = await api.get<any>("/stations", { params });
    return normalizeList(res.data, params);
  },

  async get(id: StationId) {
    const res = await api.get<Station>(`/stations/${id}`);
    return res.data;
  },

  async create(payload: StationInput) {
    const res = await api.post<Station>("/stations", payload);
    return res.data;
  },

  async update(id: StationId, payload: StationInput) {
    const res = await api.patch<Station>(`/stations/${id}`, payload);
    return res.data;
  },

  async remove(id: StationId) {
    await api.delete<void>(`/stations/${id}`);
  },
};

export default StationsAPI;
