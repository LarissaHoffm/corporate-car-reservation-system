// frontend/src/lib/auth/useAuth.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthAPI, SessionUser } from "@/lib/http/api";
import { setAccessToken, clearAccessToken, schedulePreemptiveRefresh } from "@/lib/auth/token";

export type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // bootstrap: tenta obter sessão atual
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await AuthAPI.csrf(); // garante cookie CSRF
        const me = await AuthAPI.me();
        setUser(me.data);

        // agenda refresh proativo após bootstrap
        schedulePreemptiveRefresh(async () => {
          const { data } = await AuthAPI.refresh();
          setAccessToken(data.accessToken);
        });
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    setLoading(true);
    try {
      const res = await AuthAPI.login(email, password, rememberMe);
      if (res.data?.accessToken) {
        setAccessToken(res.data.accessToken);

        // agenda refresh proativo IMEDIATO após o login
        schedulePreemptiveRefresh(async () => {
          const { data } = await AuthAPI.refresh();
          setAccessToken(data.accessToken);
        });
      }

      const u: SessionUser | undefined = (res.data as any)?.user;
      if (u) {
        setUser(u);
      } else {
        const me = await AuthAPI.me();
        setUser(me.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AuthAPI.logout();
    } catch {
      // ignore
    } finally {
      clearAccessToken();
      setUser(null);
      setLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
