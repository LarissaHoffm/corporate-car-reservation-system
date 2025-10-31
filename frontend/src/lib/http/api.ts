// frontend/src/lib/http/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth/token";

/**
 * Instância Axios apontando para o proxy do Caddy:
 * Browser -> http://localhost -> /api -> api:3000
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true, // necessário p/ cookie de refresh no mesmo domínio
<<<<<<< HEAD
  headers: { "Content-Type": "application/json" },
=======
<<<<<<< HEAD
  headers: { "Content-Type": "application/json" },
=======
<<<<<<< HEAD
<<<<<<< HEAD
  headers: { "Content-Type": "application/json" },
=======
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
=======
>>>>>>> origin/main
>>>>>>> origin/main
>>>>>>> origin/main
});
export default api;

/** Lê um cookie simples no browser */
function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Garante que o cookie de CSRF exista antes de chamadas não-idempotentes */
async function ensureCsrf() {
  const has = getCookie("csrftoken");
  if (!has) await api.get("/auth/csrf");
}

/** ---- INTERCEPTORES ----
 * 1) Request: injeta Bearer + x-csrf-token (para POST/PATCH/DELETE/PUT)
 * 2) Response: se 401 (e não for login/refresh), tenta refresh uma vez e repete a request
 */
let isRefreshing = false;
let pendingQueue: Array<(t: string | null) => void> = [];

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && !config.headers?.Authorization) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
  }

  const method = String(config.method || "get").toLowerCase();
  const needsCsrf = ["post", "put", "patch", "delete"].includes(method);
  if (needsCsrf) {
    const csrf = getCookie("csrftoken");
    if (csrf) {
      config.headers = { ...(config.headers || {}), "x-csrf-token": csrf };
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original: any = error.config;
    const status = error?.response?.status;

    const isAuthPath = (p: string | undefined) =>
      !!p && (p.includes("/auth/login") || p.includes("/auth/refresh"));

    if (status === 401 && !original?._retry && !isAuthPath(original?.url)) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const csrf = getCookie("csrftoken");
          const { data } = await api.post<{ accessToken: string }>("/auth/refresh", null, {
            headers: csrf ? { "x-csrf-token": csrf } : {},
          });
          setAccessToken(data?.accessToken || null);
          isRefreshing = false;
          pendingQueue.forEach((cb) => cb(data?.accessToken || null));
          pendingQueue = [];
        } catch (e) {
          isRefreshing = false;
          pendingQueue.forEach((cb) => cb(null));
          pendingQueue = [];
          return Promise.reject(e);
        }
      }

      return new Promise((resolve, reject) => {
        pendingQueue.push((newToken) => {
          if (!newToken) return reject(error);
          original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newToken}` };
          resolve(api(original));
        });
      });
    }

    return Promise.reject(error);
  }
);

/** ---- Contratos minimos de Auth usados pelo app ---- */

export type UserRole = "ADMIN" | "APPROVER" | "REQUESTER";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  branchId?: string | null;
  mustChangePassword?: boolean;
}

export interface MeResponse extends SessionUser {}
export interface LoginResponse {
  accessToken: string;
  user?: SessionUser;
}

export const AuthAPI = {
  /** Seta o cookie de CSRF (se ainda não existir) */
  csrf: async () => {
    return api.get<void>("/auth/csrf");
  },

  /** Login por e-mail/senha, opcional rememberMe */
  login: async (email: string, password: string, rememberMe = false) => {
    await ensureCsrf();
    const csrf = getCookie("csrftoken") || "";
    const res = await api.post<LoginResponse>(
      "/auth/login",
      { email, password, rememberMe },
      { headers: { "x-csrf-token": csrf } }
    );
    if (res.data?.accessToken) setAccessToken(res.data.accessToken);
    return res;
  },

  /** Perfil do usuário (JWT obrigatório) */
  me: async () => {
    return api.get<MeResponse>("/auth/me");
  },

  /** Alias de compatibilidade mantido pelo backend */
  get: async () => {
    return api.get<MeResponse>("/auth/get");
  },

  /** Renova o access token usando o refresh (em cookie HttpOnly) */
  refresh: async () => {
    await ensureCsrf();
    const csrf = getCookie("csrftoken") || "";
    const res = await api.post<{ accessToken: string }>("/auth/refresh", null, {
      headers: { "x-csrf-token": csrf },
    });
    setAccessToken(res.data?.accessToken || null);
    return res;
  },

  /** Logout e limpeza local de token */
  logout: async () => {
    await ensureCsrf();
    const csrf = getCookie("csrftoken") || "";
    try {
      await api.post("/auth/logout", null, { headers: { "x-csrf-token": csrf } });
    } finally {
      clearAccessToken();
    }
  },
};
