import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import StationsAPI, {
  Station,
  StationId,
  StationInput,
  StationListParams,
  StationListResponse,
  StationOrderBy,
  OrderDirection,
} from "@/lib/http/stations";
import { useDebounce } from "@/hooks/use-debounce";

type QueryState = Required<Pick<StationListParams, "page" | "pageSize">> &
  Omit<StationListParams, "page" | "pageSize">;

const defaultQuery: QueryState = {
  page: 1,
  pageSize: 10,
  q: "",
  city: "",
  branchId: "",
  isActive: undefined,
  orderBy: "name",
  order: "asc",
};

function buildErrorMessage(e: any, fallback: string): string {
  const status = e?.response?.status;
  const payload = e?.response?.data?.message;
  const base = Array.isArray(payload) ? payload.join("\n") : payload;

  if (status === 400) {
    return (
      base ||
      "Dados inválidos. Verifique os campos e tente novamente."
    );
  }

  if (status === 403) {
    return (
      base ||
      "Você não tem permissão para executar esta ação."
    );
  }

  return base || e?.message || fallback;
}

export interface UseStationsReturn {
  items: Station[];
  total: number;
  loading: boolean;
  error: string | null;

  // pagination
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;

  // query
  query: QueryState;
  setQuery: (patch: Partial<QueryState>) => void;
  onSearch: (text: string) => void;
  onSort: (orderBy: StationOrderBy, order: OrderDirection) => void;

  // crud
  createStation: (payload: StationInput) => Promise<Station | null>;
  updateStation: (
    id: StationId,
    payload: StationInput,
  ) => Promise<Station | null>;
  removeStation: (id: StationId) => Promise<boolean>;

  // misc
  refresh: () => void;
}

export function useStations(initial?: Partial<QueryState>): UseStationsReturn {
  const [query, setQueryState] = useState<QueryState>({
    ...defaultQuery,
    ...(initial ?? {}),
  });
  const [items, setItems] = useState<Station[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  // Debounce apenas do texto da busca
  const debouncedQ = useDebounce(query.q ?? "", 350);

  const effectiveParams: StationListParams = useMemo(
    () => ({
      ...query,
      q: debouncedQ || undefined,
      city: query.city || undefined,
      branchId: query.branchId || undefined,
      isActive: query.isActive,
    }),
    [query, debouncedQ],
  );

  const fetchList = useCallback(
    async (params: StationListParams) => {
      setLoading(true);
      setError(null);
      try {
        const res: StationListResponse = await StationsAPI.list(params);
        if (!mounted.current) return;
        setItems(Array.isArray(res.data) ? res.data : []);
        setTotal(typeof res.total === "number" ? res.total : 0);
      } catch (e: any) {
        if (!mounted.current) return;
        const message = buildErrorMessage(e, "Erro ao carregar postos.");
        setError(message);
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [], // buildErrorMessage agora está em escopo de módulo e é estável
  );

  useEffect(() => {
    mounted.current = true;
    fetchList(effectiveParams);
    return () => {
      mounted.current = false;
    };
  }, [fetchList, effectiveParams]);

  const setQuery = (patch: Partial<QueryState>) => {
    setQueryState((prev) => {
      const next = { ...prev, ...patch };
      // sempre que filtro muda, volta para página 1
      if (
        patch.q !== undefined ||
        patch.city !== undefined ||
        patch.branchId !== undefined ||
        patch.isActive !== undefined ||
        patch.orderBy !== undefined ||
        patch.order !== undefined
      ) {
        next.page = 1;
      }
      return next;
    });
  };

  const setPage = (p: number) => setQuery({ page: Math.max(1, p) });
  const setPageSize = (s: number) =>
    setQuery({ pageSize: Math.max(1, s), page: 1 });
  const onSearch = (text: string) => setQuery({ q: text });
  const onSort = (orderBy: StationOrderBy, order: OrderDirection) =>
    setQuery({ orderBy, order });

  const refresh = () => {
    // mesma lógica de antes, só sem o "void"
    fetchList(effectiveParams);
  };

  const createStation = async (payload: StationInput) => {
    setLoading(true);
    setError(null);
    try {
      const created = await StationsAPI.create(payload);
      // recarrega mantendo filtros; volta pra página 1 para garantir visualização
      setQuery({ page: 1 });
      await fetchList({ ...effectiveParams, page: 1 });
      return created;
    } catch (e: any) {
      const message = buildErrorMessage(e, "Falha ao criar posto.");
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateStation = async (id: StationId, payload: StationInput) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await StationsAPI.update(id, payload);
      await fetchList(effectiveParams);
      return updated;
    } catch (e: any) {
      const message = buildErrorMessage(e, "Falha ao atualizar posto.");
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const removeStation = async (id: StationId) => {
    setLoading(true);
    setError(null);
    try {
      await StationsAPI.remove(id);
      // Ajusta página se necessário e recarrega
      const newTotal = Math.max(0, total - 1);
      const maxPage = Math.max(1, Math.ceil(newTotal / query.pageSize));
      const nextPage = Math.min(query.page, maxPage);
      setQuery({ page: nextPage });
      await fetchList({ ...effectiveParams, page: nextPage });
      return true;
    } catch (e: any) {
      const message = buildErrorMessage(e, "Falha ao remover posto.");
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    total,
    loading,
    error,

    page: query.page,
    pageSize: query.pageSize,
    setPage,
    setPageSize,

    query,
    setQuery,
    onSearch,
    onSort,

    createStation,
    updateStation,
    removeStation,

    refresh,
  };
}

export default useStations;
