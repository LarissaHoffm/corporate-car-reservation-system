import { createContext, useContext, useState } from "react";
type Role = "REQUESTER" | "APPROVER" | "ADMIN";
const Ctx = createContext<{ role: Role | null }>({ role: "REQUESTER" });
export function useAuth(){ return useContext(Ctx); }
export function AuthProvider({ children }: { children: React.ReactNode }){
  const [role] = useState<Role>("REQUESTER");
  return <Ctx.Provider value={{ role }}>{children}</Ctx.Provider>;
}
