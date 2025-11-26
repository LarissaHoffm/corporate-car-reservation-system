import { useEffect, useMemo, useState } from "react";
import StationsAPI, {
  StationListResponse,
  StationListParams,
} from "@/lib/http/stations";

/**
 * Opcional: filtros para busca de cidades.
 */
type UseStationCitiesOptions = {
  branchId?: string;
  isActive?: boolean;
};

/**
 * Monta os parâmetros base para paginação de postos.
 */
function buildStationListParams(
  opts?: UseStationCitiesOptions,
): StationListParams {
  return {
    page: 1,
    pageSize: 50, // página moderada
    branchId: opts?.branchId || undefined,
    isActive:
      typeof opts?.isActive === "boolean" ? opts.isActive : undefined,
    orderBy: "city",
    order: "asc",
  };
}

/**
 * Garante que sempre teremos um array de postos.
 */
function getStationsFromResponse(res: StationListResponse): any[] {
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

/**
 * Adiciona as cidades de uma página de postos ao acumulador (set).
 */
function collectCities(acc: Set<string>, list: any[]): void {
  list.forEach((st: any) => {
    const c = (st?.city || "").toString().trim();
    if (c) acc.add(c);
  });
}

/**
 * Obtém o total a partir da resposta, com fallback para o tamanho da página.
 */
function getTotalFromResponse(
  res: StationListResponse,
  listLength: number,
): number {
  return typeof res?.total === "number" ? res.total : listLength;
}

/**
 * Regras de parada da paginação.
 */
function shouldStopPaging(listLength: number, nextPage: number): boolean {
  const reachedEmptyPage = listLength === 0;
  const reachedSafetyLimit = nextPage > 200;
  return reachedEmptyPage || reachedSafetyLimit;
}

/**
 * Ordena case-insensitive.
 */
function sortCities(acc: Set<string>): string[] {
  return Array.from(acc).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "accent" }),
  );
}

/**
 * Extrai uma mensagem de erro amigável para o usuário.
 */
function getErrorMessage(e: any): string {
  const msg =
    e?.response?.data?.message ??
    e?.message ??
    "Falha ao carregar cidades.";
  return Array.isArray(msg) ? msg[0] : String(msg);
}

/**
 * Busca e deduplica TODAS as cidades existentes na base de postos do tenant atual,
 * paginando /stations até cobrir o total.
 */
async function fetchAllStationCities(
  paramsBase: StationListParams,
): Promise<string[]> {
  const acc = new Set<string>();
  let page = 1;
  let fetched = 0;
  let total = Infinity;

  while (fetched < total) {
    const res: StationListResponse = await StationsAPI.list({
      ...paramsBase,
      page,
    });

    const list = getStationsFromResponse(res);
    collectCities(acc, list);

    fetched += list.length;
    total = getTotalFromResponse(res, list.length);

    const nextPage = page + 1;
    if (shouldStopPaging(list.length, nextPage)) {
      break;
    }

    page = nextPage;
  }

  return sortCities(acc);
}

export function useStationCities(opts?: UseStationCitiesOptions) {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const paramsBase = buildStationListParams(opts);

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const sortedCities = await fetchAllStationCities(paramsBase);
        if (!cancelled) {
          setCities(sortedCities);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [opts?.branchId, opts?.isActive]);

  // inclui a opção "all" no topo quando usado no Select
  const selectItems = useMemo(() => ["all", ...cities], [cities]);

  return { cities, selectItems, loading, error };
}

export default useStationCities;
