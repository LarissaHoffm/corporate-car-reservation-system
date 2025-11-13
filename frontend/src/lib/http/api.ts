import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "@/lib/auth/token";

export const api = axios.create({
  baseURL: (import.meta as any)?.env?.VITE_API_BASE_URL ?? "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
export default api;

function isAxiosHeaders(h: unknown): h is AxiosHeaders {
  return !!h && typeof (h as any).set === "function";
}

function setHeader(
  config: InternalAxiosRequestConfig,
  key: string,
  value: string,
) {
  if (isAxiosHeaders(config.headers)) {
    (config.headers as AxiosHeaders).set(key, value);
  } else {
    const headers = (config.headers ?? {}) as Record<string, string>;
    headers[key] = value;
    config.headers = headers as any;
  }
}

// cookies/CSRF
function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function getCsrfCookie(): string | null {
  return getCookie("rcsrftoken") || getCookie("csrftoken");
}
async function ensureCsrf() {
  if (!getCsrfCookie()) await api.get("/auth/csrf");
}

// interceptors
let isRefreshing = false;
let pendingQueue: Array<(t: string | null) => void> = [];

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Bearer
  const token = getAccessToken();
  if (token) {
    setHeader(config, "Authorization", `Bearer ${token}`);
  }

  // CSRF só para refresh/logout
  const url = config.url || "";
  const needsCsrf =
    url.endsWith("/auth/refresh") || url.endsWith("/auth/logout");
  if (needsCsrf) {
    const csrf = getCsrfCookie();
    if (csrf) setHeader(config, "x-csrf-token", csrf);
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original: any = error.config;
    const status = error?.response?.status;

    const isAuthPath = (p?: string) =>
      !!p &&
      (p.includes("/auth/login") ||
        p.includes("/auth/refresh") ||
        p.includes("/auth/logout"));

    if (status === 401 && !original?._retry && !isAuthPath(original?.url)) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await ensureCsrf();
          const csrf = getCsrfCookie() || "";
          const { data } = await api.post<{ accessToken: string }>(
            "/auth/refresh",
            {},
            {
              headers: csrf ? { "x-csrf-token": csrf } : {},
            },
          );
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
          // garante Authorization no retry
          if (!original.headers) original.headers = {};
          if (isAxiosHeaders(original.headers)) {
            (original.headers as AxiosHeaders).set(
              "Authorization",
              `Bearer ${newToken}`,
            );
          } else {
            original.headers = {
              ...(original.headers || {}),
              Authorization: `Bearer ${newToken}`,
            };
          }
          resolve(api(original));
        });
      });
    }

    return Promise.reject(error);
  },
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

// ---------- API de Auth ----------
export const AuthAPI = {
  // Seta o cookie de CSRF
  csrf: async () => api.get<void>("/auth/csrf"),

  login: async (
    a: { email: string; password: string; rememberMe?: boolean } | string,
    b?: string,
    c?: boolean,
  ) => {
    const email = typeof a === "string" ? a : a.email;
    const password = typeof a === "string" ? (b as string) : a.password;
    const rememberMe = typeof a === "string" ? (c ?? false) : !!a.rememberMe;

    await ensureCsrf();
    const res = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
      rememberMe,
    });
    if (res.data?.accessToken) setAccessToken(res.data.accessToken);
    return res;
  },

  me: async () => api.get<MeResponse>("/auth/me"),

  get: async () => api.get<MeResponse>("/auth/get"),

  refresh: async () => {
    await ensureCsrf();
    const csrf = getCsrfCookie() || "";
    const res = await api.post<{ accessToken: string }>(
      "/auth/refresh",
      {},
      {
        headers: csrf ? { "x-csrf-token": csrf } : {},
      },
    );
    setAccessToken(res.data?.accessToken || null);
    return res;
  },

  logout: async () => {
    await ensureCsrf();
    const csrf = getCsrfCookie() || "";
    try {
      await api.post(
        "/auth/logout",
        {},
        { headers: csrf ? { "x-csrf-token": csrf } : {} },
      );
    } finally {
      clearAccessToken();
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.post<{ accessToken: string; user: SessionUser }>(
      "/auth/change-password",
      { currentPassword, newPassword },
    );
    if (res.data?.accessToken) setAccessToken(res.data.accessToken);
    return res;
  },
};
