// frontend/src/hooks/use-station-cities.ts
import { useEffect, useMemo, useRef, useState } from "react";
import StationsAPI, { StationListResponse, StationListParams } from "@/lib/http/stations";

/**
 * Busca e deduplica TODAS as cidades existentes na base de postos do tenant atual,
 * paginando /stations até cobrir o total. Não altera UI por si só.
 *
 * Obs.: depois podemos trocar por um endpoint otimizado (/stations/cities).
 */
export function useStationCities(opts?: { branchId?: string; isActive?: boolean }) {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const paramsBase: StationListParams = {
          page: 1,
          pageSize: 50, // pagina moderada
          branchId: opts?.branchId || undefined,
          isActive: typeof opts?.isActive === "boolean" ? opts?.isActive : undefined,
          orderBy: "city",
          order: "asc",
        };

        const acc = new Set<string>();
        let page = 1;
        let fetched = 0;
        let total = Infinity;

        while (fetched < total) {
          const res: StationListResponse = await StationsAPI.list({ ...paramsBase, page });
          // protege contra respostas inesperadas
          const list = Array.isArray(res?.data) ? res.data : [];
          list.forEach((st: any) => {
            const c = (st?.city || "").toString().trim();
            if (c) acc.add(c);
          });

          fetched += list.length;
          total = typeof res?.total === "number" ? res.total : list.length;
          page += 1;

          // guarda corpo se desmontar
          if (!mounted.current) return;

          // break de segurança caso a API esteja sem paginação real
          if (list.length === 0) break;
          // limite de páginas para evitar loop infinito em caso de API bugada
          if (page > 200) break;
        }

        // ordena case-insensitive
        const sorted = Array.from(acc).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "accent" })
        );

        if (mounted.current) setCities(sorted);
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? "Falha ao carregar cidades.";
        if (mounted.current) setError(Array.isArray(msg) ? msg[0] : String(msg));
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();

    return () => {
      mounted.current = false;
    };
  }, [opts?.branchId, opts?.isActive]);

  // inclui a opção "all" no topo quando usado no Select
  const selectItems = useMemo(() => ["all", ...cities], [cities]);

  return { cities, selectItems, loading, error };
}

export default useStationCities;
