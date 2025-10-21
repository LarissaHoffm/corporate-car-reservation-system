import { api } from "./api";

export type UserRole = "ADMIN" | "APPROVER" | "REQUESTER";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  branchId?: string | null;
  mustChangePassword?: boolean;
  createdAt?: string;
}

export interface CreatedUserResponse extends User {
  temporaryPassword?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  branchId?: string;
  role?: UserRole;
}

export async function createUser(input: CreateUserInput) {
  const body = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== ""));
  const { data } = await api.post<CreatedUserResponse>("/users", body);
  return data;
}

export interface ListUsersParams {
  q?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

export async function listUsers(params: ListUsersParams = {}) {
  const { data } = await api.get<User[]>("/users", { params });
  return data;
}

export async function getUser(id: string) {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
}

export interface UpdateUserInput {
  name?: string;
  branchId?: string;
  status?: UserStatus;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const body = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  const { data } = await api.patch<User>(`/users/${id}`, body);
  return data;
}

export async function deleteUser(id: string) {
  await api.delete<void>(`/users/${id}`);
}

export async function makeApprover(id: string) {
  const { data } = await api.patch<User>(`/users/${id}/make-approver`, {});
  return data;
}

export async function revokeApprover(id: string) {
  const { data } = await api.patch<User>(`/users/${id}/revoke-approver`, {});
  return data;
}
