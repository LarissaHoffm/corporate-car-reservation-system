import { useEffect, useState } from "react";
import { api } from "@/lib/http/api";

export type BranchDTO = { id: string; name: string; tenantId?: string };

export function useBranches() {
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    api.get<BranchDTO[]>("/branches")
      .then(res => {
        if (!alive) return;
        setBranches(res.data ?? []);
      })
      .catch((e) => {
        if (!alive) return;
        const msg = e?.response?.data?.message || e?.message || "Erro desconhecido";
        setError(String(msg));
      })
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, []);

  return { branches, loading, error };
}
