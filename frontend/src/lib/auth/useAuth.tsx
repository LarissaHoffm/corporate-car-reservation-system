import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AuthAPI, SessionUser } from "@/lib/http/api";
import {
  setAccessToken,
  clearAccessToken,
  schedulePreemptiveRefresh,
} from "@/lib/auth/token";

export type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
};

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  setUser: () => {},
});

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await AuthAPI.csrf(); // garante csrftoken
        const { data: r } = await AuthAPI.refresh(); // silent re-auth
        if (r?.accessToken) setAccessToken(r.accessToken);

        const me = await AuthAPI.me(); // agora temos Bearer válido
        setUser(me.data);

        // agenda refresh proativo após bootstrap
        schedulePreemptiveRefresh(async () => {
          const { data } = await AuthAPI.refresh();
          if (data?.accessToken) setAccessToken(data.accessToken);
        });
      } catch {
        setUser(null); // sem sessão válida
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** Login normal */
  const login = async (email: string, password: string, rememberMe = false) => {
    setLoading(true);
    try {
      const res = await AuthAPI.login(email, password, rememberMe);
      if (res.data?.accessToken) {
        setAccessToken(res.data.accessToken);

        schedulePreemptiveRefresh(async () => {
          const { data } = await AuthAPI.refresh();
          if (data?.accessToken) setAccessToken(data.accessToken);
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

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, setUser }),
    [user, loading],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
