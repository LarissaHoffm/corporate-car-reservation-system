import type { MeResponse } from "@/lib/http/api";

export type SessionUser = MeResponse;

export type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh?: () => Promise<void>;
};
