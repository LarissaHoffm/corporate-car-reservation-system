// src/hooks/use-reservations.ts
import { useEffect, useMemo, useRef, useState } from "react";
import ReservationsAPI, {
  type Reservation,
  type ReservationInput,
  type QueryReservations,
} from "@/lib/http/reservations";

type PageInfo = { page: number; pageSize: number; total: number };

// Query padrão (sem filtrar por status)
const DEFAULT_QUERY: QueryReservations = { page: 1, pageSize: 20, status: "ALL" };

export default function useReservations() {
  // ------ listas (shared = todas / requester = minhas) ------
  const [items, setItems] = useState<Reservation[]>([]);
  const [itemsInfo, setItemsInfo] = useState<PageInfo>({ page: 1, pageSize: 20, total: 0 });

  const [myItems, setMyItems] = useState<Reservation[]>([]);
  const [myInfo, setMyInfo] = useState<PageInfo>({ page: 1, pageSize: 20, total: 0 });

  // ------ filtros ------
  const [query, setQuery] = useState<QueryReservations>(DEFAULT_QUERY);
  const [mineQuery, setMineQuery] = useState<QueryReservations>(DEFAULT_QUERY);

  // ------ estados gerais ------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ids com ação em andamento (para desabilitar botões por linha)
  const actingIdsRef = useRef<Set<string>>(new Set());
  const [, force] = useState(0);
  const isActing = (id?: string | null) => !!(id && actingIdsRef.current.has(id));
  const setActing = (id: string, v: boolean) => {
    const s = actingIdsRef.current;
    v ? s.add(id) : s.delete(id);
    force((x) => x + 1); // re-render leve
  };

  // Normaliza query (não manda status=ALL para API)
  const norm = (q: QueryReservations) => {
    const p: any = { ...q };
    if (p.status === "ALL") delete p.status;
    return p as QueryReservations;
  };

  // ------ carregamentos ------
  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const data = await ReservationsAPI.list(norm(query));
      setItems(data.items ?? []);
      setItemsInfo({ page: data.page, pageSize: data.pageSize, total: data.total });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }

  async function loadMine() {
    setLoading(true);
    setError(null);
    try {
      const data = await ReservationsAPI.listMine(norm(mineQuery));
      setMyItems(data.items ?? []);
      setMyInfo({ page: data.page, pageSize: data.pageSize, total: data.total });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load my reservations");
    } finally {
      setLoading(false);
    }
  }

  // auto-carregar quando filtros mudam (cada página usa só o que precisa)
  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [JSON.stringify(query)]);
  useEffect(() => { loadMine(); /* eslint-disable-next-line */ }, [JSON.stringify(mineQuery)]);

  // refresh manual (↻)
  async function refresh() {
    await Promise.allSettled([loadAll(), loadMine()]);
  }

  // busca texto (atualiza ambos, páginas usam o relevante)
  function onSearch(text: string) {
    setQuery((q) => ({ ...q, q: text, page: 1 }));
    setMineQuery((q) => ({ ...q, q: text, page: 1 }));
  }

  // ------ ações ------
  async function createReservation(body: ReservationInput) {
    setError(null);
    try {
      const created = await ReservationsAPI.create(body);
      // após criar, atualiza "Minhas reservas"
      await loadMine();
      return created;
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to create reservation";
      setError(msg);
      throw e;
    }
  }

  async function approveReservation(id: string) {
    setActing(id, true);
    setError(null);
    try {
      const res = await ReservationsAPI.approve(id);
      await refresh();
      return res;
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to approve");
      throw e;
    } finally {
      setActing(id, false);
    }
  }

  async function cancelReservation(id: string) {
    setActing(id, true);
    setError(null);
    try {
      const res = await ReservationsAPI.cancel(id);
      await refresh();
      return res;
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to cancel");
      throw e;
    } finally {
      setActing(id, false);
    }
  }

  async function removeReservation(id: string) {
    setActing(id, true);
    setError(null);
    try {
      const res = await ReservationsAPI.remove(id);
      await refresh();
      return res;
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete");
      throw e;
    } finally {
      setActing(id, false);
    }
  }

  async function getReservation(id: string) {
    setError(null);
    try {
      return await ReservationsAPI.getById(id);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load reservation");
      throw e;
    }
  }

  // atalhos de período rápido (Hoje/7d/30d etc.) — o componente pode usar se quiser
  function setQuickRange(days: number, mine = false) {
    const from = new Date();
    from.setDate(from.getDate() - Math.max(0, days));
    const to = new Date();
    const iso = (d: Date) => d.toISOString();
    if (mine) {
      setMineQuery((q) => ({ ...q, from: iso(from), to: iso(to), page: 1 }));
    } else {
      setQuery((q) => ({ ...q, from: iso(from), to: iso(to), page: 1 }));
    }
  }

  return {
    // listas
    items,
    itemsInfo,
    myItems,
    myInfo,

    // estados
    loading,
    error,

    // filtros
    query,
    setQuery,
    mineQuery,
    setMineQuery,
    onSearch,
    setQuickRange,

    // refresh
    refresh,

    // ações
    createReservation,
    approveReservation,
    cancelReservation,
    removeReservation,
    getReservation,

    // UI helpers
    isActing,
  };
}
