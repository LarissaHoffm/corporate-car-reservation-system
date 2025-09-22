import type { MeResponse } from "@/lib/http/api";
import { AuthAPI } from "@/lib/http/api";
import {
  setAccessToken,
  clearToken,
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
  const { data } = await AuthAPI.login({ email, password, rememberMe });
  setAccessToken(data.accessToken);
  const me = await AuthAPI.me();
  setCurrentUser(me.data);

  schedulePreemptiveRefresh(async () => {
    const { data: r } = await AuthAPI.refresh();
    setAccessToken(r.accessToken);
  });

  return me.data;
}

export async function logout(): Promise<void> {
  try {
    await AuthAPI.logout();
  } finally {
    clearToken();
    setCurrentUser(null);
  }
}

export async function refresh(): Promise<MeResponse> {
  const { data } = await AuthAPI.refresh();
  setAccessToken(data.accessToken);
  const me = await AuthAPI.me();
  setCurrentUser(me.data);
  return me.data;
}

export async function me(): Promise<MeResponse> {
  const me = await AuthAPI.me();
  setCurrentUser(me.data);
  return me.data;
}
