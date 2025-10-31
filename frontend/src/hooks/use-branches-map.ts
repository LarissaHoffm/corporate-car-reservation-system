import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/http/api";

/**
 * Busca filiais do tenant logado e expõe:
 *  - names: string[] (ordenado, seguro para map())
 *  - idToName / nameToId: dicionários para mapear nos cards e payloads
 */
type Branch = { id: string; name: string; city?: string };

export function useBranchesMap() {
  const [list, setList] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get<Branch[]>("/branches");
        if (!alive) return;
        setList(Array.isArray(data) ? data : []);
      } catch {
        // se 401/403, mantém vazio para não quebrar a UI
        setList([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const names = useMemo(
    () => [...list.map((b) => b.name).filter(Boolean)].sort((a, b) => a.localeCompare(b)),
    [list]
  );

  const idToName = useMemo(() => {
    const dict: Record<string, string> = {};
    for (const b of list) if (b?.id && b?.name) dict[b.id] = b.name;
    return dict;
  }, [list]);

  const nameToId = useMemo(() => {
    const dict: Record<string, string> = {};
    for (const b of list) if (b?.id && b?.name) dict[b.name] = b.id;
    return dict;
  }, [list]);

  return { names, idToName, nameToId, loading };
}
