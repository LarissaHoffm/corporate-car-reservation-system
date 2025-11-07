import { useEffect, useState } from "react";
import { Branch, BranchesAPI } from "@/lib/http/branches";

export function useBranchesMap() {
  const [map, setMap] = useState<Record<string, Branch>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await BranchesAPI.list();
        if (!mounted) return;
        const m: Record<string, Branch> = {};
        for (const b of list) m[b.id] = b;
        setMap(m);
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar filiais");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { map, loading, error };
}
