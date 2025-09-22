import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { getAccessToken, setAccessToken } from "@/lib/auth/token";

export type UserRole = "ADMIN" | "APPROVER" | "REQUESTER";
export type MeResponse = { id: string; email: string; role: UserRole; branch?: string };

const baseURL = import.meta.env.VITE_API_URL as string;
if (!baseURL) console.warn("[api] VITE_API_URL ausente (.env.local)");

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function attachAuthAndCsrf(config: AxiosRequestConfig) {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  // CSRF 
  const csrf = getCookie("csrfToken");
  if (csrf) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)["x-csrf-token"] = csrf;
  }
  return config;
}

// instância principal (com interceptors)
export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});
// instância crua para login/refresh (sem loop)
const raw: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

// aplica header CSRF também no raw (refresh/logout)
raw.interceptors.request.use(attachAuthAndCsrf);
api.interceptors.request.use(attachAuthAndCsrf);

// controle de refresh único
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
type ResolveFn = (t: string) => void;
const waiters: ResolveFn[] = [];
const enqueue = (r: ResolveFn) => waiters.push(r);
const flush = (t: string) => { while (waiters.length) waiters.shift()!(t); };

async function doRefresh(): Promise<string> {
  const { data } = await raw.post<{ accessToken: string; csrfToken?: string }>("/auth/refresh", {});
  const newToken = data?.accessToken;
  if (!newToken) throw new Error("Refresh não retornou accessToken");
  setAccessToken(newToken);
  return newToken;
}
function ensureSingleRefresh(): Promise<string> {
  if (isRefreshing && refreshPromise) return new Promise<string>((res) => enqueue(res));
  isRefreshing = true;
  refreshPromise = doRefresh()
    .then((t) => { flush(t); return t; })
    .finally(() => { isRefreshing = false; refreshPromise = null; });
  return new Promise<string>((res) => enqueue(res));
}

// 401 → tenta 1x refresh e refaz a chamada
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    // não tenta refresh para chamadas /auth/*
    const isAuthPath = original?.url?.startsWith("/auth/");
    if (status !== 401 || original?._retry || isAuthPath) throw error;

    try {
      original!._retry = true;
      const newToken = await ensureSingleRefresh();
      original!.headers = original!.headers ?? {};
      (original!.headers as Record<string, string>)["Authorization"] = `Bearer ${newToken}`;
      return api.request(original!);
    } catch (e) {
      throw e;
    }
  }
);

// endpoints
export const AuthAPI = {
  login: (p: { email: string; password: string; rememberMe?: boolean }) =>
    raw.post<{ accessToken: string; user: MeResponse; csrfToken?: string }>("/auth/login", p),
  refresh: () => raw.post<{ accessToken: string; csrfToken?: string }>("/auth/refresh", {}),
  logout: () => raw.post<{ ok: true }>("/auth/logout", {}),
  me: () => api.get<MeResponse>("/auth/me"),
};
