import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth/token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
export default api;

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function getCsrfCookie(): string | null {
  return getCookie("rcsrftoken") || getCookie("csrftoken");
}

// Garante que exista um cookie de CSRF antes de refresh/logout 
async function ensureCsrf() {
  if (!getCsrfCookie()) await api.get("/auth/csrf");
}


let isRefreshing = false;
let pendingQueue: Array<(t: string | null) => void> = [];

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Bearer
  const token = getAccessToken();
  if (token && !config.headers?.Authorization) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
  }

  // CSRF só para refresh/logout
  const url = config.url || "";
  const needsCsrf = url.endsWith("/auth/refresh") || url.endsWith("/auth/logout");
  if (needsCsrf) {
    const csrf = getCsrfCookie();
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
      !!p &&
      (p.includes("/auth/login") ||
        p.includes("/auth/refresh") ||
        p.includes("/auth/logout"));

    // Tenta 1x refresh no 401 (exceto em rotas de auth)
    if (status === 401 && !original?._retry && !isAuthPath(original?.url)) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await ensureCsrf();
          const csrf = getCsrfCookie();
          const { data } = await api.post<{ accessToken: string }>("/auth/refresh", {}, {
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
          clearAccessToken();
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
  // Seta o cookie de CSRF  
  csrf: async () => api.get<void>("/auth/csrf"),


  login: async (
    a: { email: string; password: string; rememberMe?: boolean } | string,
    b?: string,
    c?: boolean
  ) => {
    const email = typeof a === "string" ? a : a.email;
    const password = typeof a === "string" ? (b as string) : a.password;
    const rememberMe = typeof a === "string" ? (c ?? false) : !!a.rememberMe;

    await ensureCsrf();
    const res = await api.post<LoginResponse>("/auth/login", { email, password, rememberMe });
    if (res.data?.accessToken) setAccessToken(res.data.accessToken);
    return res;
  },

  me: async () => api.get<MeResponse>("/auth/me"),

  get: async () => api.get<MeResponse>("/auth/get"),

  refresh: async () => {
    await ensureCsrf();
    const csrf = getCsrfCookie() || "";
    const res = await api.post<{ accessToken: string }>("/auth/refresh", {}, {
      headers: { "x-csrf-token": csrf },
    });
    setAccessToken(res.data?.accessToken || null);
    return res;
  },

  logout: async () => {
    await ensureCsrf();
    const csrf = getCsrfCookie() || "";
    try {
      await api.post("/auth/logout", {}, { headers: { "x-csrf-token": csrf } });
    } finally {
      clearAccessToken();
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.post<{ accessToken: string; user: SessionUser }>(
      "/auth/change-password",
      { currentPassword, newPassword }
    );
    if (res.data?.accessToken) setAccessToken(res.data.accessToken);
    return res;
  },
};
