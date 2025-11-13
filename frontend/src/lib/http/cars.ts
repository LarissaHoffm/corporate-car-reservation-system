import { api } from "./api";

export type CarStatus =
  | "AVAILABLE"
  | "IN_USE"
  | "MAINTENANCE"
  | "INACTIVE"
  | "ACTIVE";

export type Car = {
  id: string;
  plate: string;
  model: string;
  color?: string | null;
  mileage: number;
  status: CarStatus;
  branchId?: string | null;
};

export type CreateCarDto = {
  plate: string;
  model: string;
  color?: string;
  mileage?: number;
  status?: CarStatus;
  branchName?: string; // backend aceita por nome
  branchId?: string; // ou por UUID
};

export type UpdateCarDto = Partial<CreateCarDto>;

export const CarsAPI = {
  async list(params?: { status?: CarStatus; branchId?: string }) {
    const { data } = await api.get<Car[]>("/cars", { params });
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<Car>(`/cars/${id}`);
    return data;
  },

  async create(body: CreateCarDto) {
    const { data } = await api.post<Car>("/cars", body);
    return data;
  },

  async update(id: string, body: UpdateCarDto) {
    const { data } = await api.patch<Car>(`/cars/${id}`, body);
    return data;
  },

  async remove(id: string) {
    await api.delete(`/cars/${id}`);
  },
};
