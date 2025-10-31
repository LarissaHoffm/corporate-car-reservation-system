import { useEffect, useMemo, useState } from "react";
import { Branch, BranchesAPI } from "@/lib/http/branches";

type BranchMap = Record<string, Branch>;

export function useBranchesMap() {
  const [list, setList] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const items = await BranchesAPI.list();
        if (!alive) return;
        setList(Array.isArray(items) ? items : []);
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setList([]);
        setError(e?.message || "Falha ao carregar filiais");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const map: BranchMap = useMemo(() => {
    const m: BranchMap = {};
    for (const b of list) if (b?.id) m[b.id] = b;
    return m;
  }, [list]);

  const names = useMemo(
    () => list.map((b) => b?.name).filter(Boolean).sort((a, b) => a!.localeCompare(b!)) as string[],
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

  return { list, map, names, idToName, nameToId, loading, error };
}
