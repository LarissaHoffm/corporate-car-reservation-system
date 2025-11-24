import { api } from "./api";

/** Tipos usados nas páginas */
export type UserRole = "ADMIN" | "APPROVER" | "REQUESTER";
export type UserStatus = "ACTIVE" | "INACTIVE";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  branchId?: string | null;
  department?: string | null;
  phone?: string | null;

  // Campo opcional retornado pelo backend; usado apenas para exibir avatar quando disponível
  photoUrl?: string | null;

  createdAt?: string;
  updatedAt?: string;
  branch?: { id: string; name: string } | null;
};

export type CreatedUserResponse = User & {
  /** vem quando o ADMIN cria um usuário sem informar senha */
  temporaryPassword?: string;
};

/** Listar usuários (filtros opcionais) */
export async function listUsers(params?: { q?: string; branchId?: string }) {
  const { data } = await api.get<User[]>("/users", { params });
  return data;
}

/** Criar usuário */
export async function createUser(payload: {
  name: string;
  email: string;
  role?: UserRole;
  branchId?: string;
  department?: string;
  phone?: string; // somente dígitos
}) {
  const { data } = await api.post<CreatedUserResponse>("/users", payload);
  return data;
}

/** Remover usuário */
export async function deleteUser(id: string) {
  const { data } = await api.delete<{ ok: boolean }>(`/users/${id}`);
  return data;
}

/** Detalhes de usuário */
export async function getUser(id: string) {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
}

/** Atualizar usuário (admin / perfil) */
export async function updateUser(
  id: string,
  // payload aceita campos básicos do usuário (name, email, role, branchId, department, phone, status)
  payload: Partial<Omit<User, "id" | "createdAt" | "updatedAt" | "branch">>,
) {
  const { data } = await api.patch<User>(`/users/${id}`, payload);
  return data;
}

/** Histórico de reservas do usuário */
export async function listUserReservations(userId: string) {
  const { data } = await api.get<any[]>(`/users/${userId}/reservations`);
  return data;
}

/** Alterar a PRÓPRIA senha (SELF) – envia cookies (refresh) */
export async function setOwnPassword(
  userId: string,
  body: { currentPassword?: string; newPassword: string },
) {
  const { data } = await api.patch<{ ok: boolean }>(
    `/users/${userId}/password`,
    body,
    { withCredentials: true }, // garante envio dos cookies
  );
  return data;
}
