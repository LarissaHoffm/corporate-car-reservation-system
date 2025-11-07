import type { MeResponse } from "@/lib/http/api";
import { AuthAPI } from "@/lib/http/api";
import {
  setAccessToken,
  clearAccessToken as clearToken,
  schedulePreemptiveRefresh,
} from "@/lib/auth/token";

let _user: MeResponse | null = null;
const subs = new Set<(u: MeResponse | null) => void>();

function notify() {
  subs.forEach((cb) => cb(_user));
}

export function getCurrentUser(): MeResponse | null {
  return _user;
}

export function setCurrentUser(u: MeResponse | null) {
  _user = u;
  notify();
}

export function onAuthChange(cb: (u: MeResponse | null) => void) {
  subs.add(cb);
  return () => subs.delete(cb);
}

export async function login(
  email: string,
  password: string,
  rememberMe = false
): Promise<MeResponse> {
  const { data } = await AuthAPI.login(email, password, rememberMe);
  if (data?.accessToken) setAccessToken(data.accessToken);

  const me = await AuthAPI.me();
  setCurrentUser(me.data);

  schedulePreemptiveRefresh(async () => {
    const { data: r } = await AuthAPI.refresh();
    if (r?.accessToken) setAccessToken(r.accessToken);
  });

  return me.data;
}

export async function logout(): Promise<void> {
  try {
    // força um csrftoken atual para garantir header/cookie em /auth/logout
    await AuthAPI.csrf();
    await AuthAPI.logout();
  } finally {
    clearToken();
    setCurrentUser(null);
  }
}

// Força refresh do access + rehidrata o usuário 
export async function refresh(): Promise<MeResponse> {
  const { data } = await AuthAPI.refresh();
  if (data?.accessToken) setAccessToken(data.accessToken);

  const me = await AuthAPI.me();
  setCurrentUser(me.data);
  return me.data;
}

export async function me(): Promise<MeResponse> {
  const m = await AuthAPI.me();
  setCurrentUser(m.data);
  return m.data;
}

export function isAuthenticated(): boolean {
  return !!_user?.id;
}

export function mustChangePassword(): boolean {
  return !!_user?.mustChangePassword;
}

export async function initAuth(): Promise<void> {
  try {
    await AuthAPI.csrf(); // garante cookie CSRF antes do refresh
    const { data } = await AuthAPI.refresh();
    if (data?.accessToken) setAccessToken(data.accessToken);

    const me = await AuthAPI.me();
    setCurrentUser(me.data);

    // agenda auto-refresh contínuo
    schedulePreemptiveRefresh(async () => {
      const { data: r } = await AuthAPI.refresh();
      if (r?.accessToken) setAccessToken(r.accessToken);
    });
  } catch {
    // silencioso: sem sessão válida, segue deslogado
    clearToken();
    setCurrentUser(null);
  }
}
