<<<<<<< HEAD
=======
<<<<<<< HEAD
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
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
=======
>>>>>>> origin/main
>>>>>>> origin/main
}
