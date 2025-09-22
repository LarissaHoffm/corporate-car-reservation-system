import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthAPI, MeResponse } from "@/lib/http/api";
import { clearToken, schedulePreemptiveRefresh, setAccessToken } from "@/lib/auth/token";
import { setCurrentUser } from "./state";

type AuthCtx = {
  user: MeResponse | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: MeResponse["role"] | MeResponse["role"][]) => boolean;
  reloadUser: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const { data } = await AuthAPI.refresh();         // usa cookie httpOnly + CSRF
      setAccessToken(data.accessToken);
      const me = await AuthAPI.me();
      setUser(me.data);
      setCurrentUser(me.data);                           // <-- alimenta compat

      schedulePreemptiveRefresh(async () => {
        const { data: r } = await AuthAPI.refresh();
        setAccessToken(r.accessToken);
      });
    } catch {
      clearToken();
      setUser(null);
      setCurrentUser(null);                              // <-- zera compat
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    const { data } = await AuthAPI.login({ email, password, rememberMe });
    setAccessToken(data.accessToken);
    const me = await AuthAPI.me();
    setUser(me.data);
    setCurrentUser(me.data);                             // <-- compat

    schedulePreemptiveRefresh(async () => {
      const { data: r } = await AuthAPI.refresh();
      setAccessToken(r.accessToken);
    });
  }, []);

  const logout = useCallback(async () => {
    try { await AuthAPI.logout(); } finally {
      clearToken();
      setUser(null);
      setCurrentUser(null);                              // <-- compat
    }
  }, []);

  const hasRole = useCallback((role: MeResponse["role"] | MeResponse["role"][]) => {
    if (!user) return false;
    const arr = Array.isArray(role) ? role : [role];
    return arr.includes(user.role);
  }, [user]);

  const reloadUser = useCallback(async () => {
    const me = await AuthAPI.me();
    setUser(me.data);
    setCurrentUser(me.data);                             // <-- compat
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user, loading, login, logout, hasRole, reloadUser
  }), [user, loading, login, logout, hasRole, reloadUser]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
