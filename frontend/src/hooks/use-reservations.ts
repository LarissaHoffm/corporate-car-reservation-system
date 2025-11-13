import { useCallback, useMemo, useRef, useState } from "react";
import {
  ReservationsAPI,
  type Reservation,
  type ReservationInput,
  type ReservationApproveInput,
} from "@/lib/http/reservations";
import { CarsAPI, type Car } from "@/lib/http/cars";

type OpResult = { ok: true } | { ok: false; error?: string };

type LoadingState = {
  my: boolean;
  pending: boolean;
  list: boolean;
  get: boolean;
  create: boolean;
  approve: boolean;
  cancel: boolean;
  remove: boolean;
  complete: boolean;
};

type ErrorState = {
  list?: string;
  get?: string;
  create?: string;
  approve?: string;
  cancel?: string;
  remove?: string;
  complete?: string;
};

export default function useReservations() {
  const [myItems, setMyItems] = useState<Reservation[]>([]);
  const [pendingItems, setPendingItems] = useState<Reservation[]>([]);
  const [items, setItems] = useState<Reservation[]>([]);
  const cacheRef = useRef<Map<string, Reservation>>(new Map());

  const [loading, setLoading] = useState<LoadingState>({
    my: false,
    pending: false,
    list: false,
    get: false,
    create: false,
    approve: false,
    cancel: false,
    remove: false,
    complete: false,
  });

  const [errors, setErrors] = useState<ErrorState>({});

  const setLoadingKey = useCallback(
    (key: keyof LoadingState, value: boolean) => {
      setLoading((s) => ({ ...s, [key]: value }));
    },
    [],
  );

  const setErrorKey = useCallback((key: keyof ErrorState, value?: string) => {
    setErrors((s) => ({ ...s, [key]: value }));
  }, []);

  const msgFromErr = (err: any) =>
    err?.response?.data?.message ||
    err?.message ||
    "Não foi possível completar a operação.";

  const refreshMy = useCallback(async () => {
    setErrorKey("list", undefined);
    setLoadingKey("my", true);
    try {
      const data = await ReservationsAPI.listMine();
      setMyItems(Array.isArray(data) ? data : []);
      data?.forEach?.((r) => cacheRef.current.set(r.id, r));
    } catch (err: any) {
      setErrorKey("list", msgFromErr(err));
      setMyItems([]);
    } finally {
      setLoadingKey("my", false);
    }
  }, [setErrorKey, setLoadingKey]);

  const refreshPending = useCallback(async () => {
    setErrorKey("list", undefined);
    setLoadingKey("pending", true);
    try {
      const data = await ReservationsAPI.list({ status: "PENDING" });
      setPendingItems(Array.isArray(data) ? data : []);
      data?.forEach?.((r) => cacheRef.current.set(r.id, r));
    } catch (err: any) {
      setErrorKey("list", msgFromErr(err));
      setPendingItems([]);
    } finally {
      setLoadingKey("pending", false);
    }
  }, [setErrorKey, setLoadingKey]);

  const refresh = useCallback(async () => {
    setErrorKey("list", undefined);
    setLoadingKey("list", true);
    try {
      const data = await ReservationsAPI.list();
      setItems(Array.isArray(data) ? data : []);
      data?.forEach?.((r) => cacheRef.current.set(r.id, r));
    } catch (err: any) {
      setErrorKey("list", msgFromErr(err));
      setItems([]);
    } finally {
      setLoadingKey("list", false);
    }
  }, [setErrorKey, setLoadingKey]);

  const createReservation = useCallback(
    async (body: ReservationInput): Promise<OpResult> => {
      setErrorKey("create", undefined);
      setLoadingKey("create", true);
      try {
        const created = await ReservationsAPI.create(body);
        cacheRef.current.set(created.id, created);
        setMyItems((arr) => [created, ...arr]);
        return { ok: true };
      } catch (err: any) {
        const msg = msgFromErr(err);
        setErrorKey("create", msg);
        return { ok: false, error: msg };
      } finally {
        setLoadingKey("create", false);
      }
    },
    [setErrorKey, setLoadingKey],
  );

  const approveReservation = useCallback(
    async (id: string, body: ReservationApproveInput): Promise<OpResult> => {
      setErrorKey("approve", undefined);
      setLoadingKey("approve", true);
      try {
        const updated = await ReservationsAPI.approve(id, body);
        cacheRef.current.set(updated.id, updated);
        setPendingItems((arr) => arr.filter((r) => r.id !== id));
        setItems((arr) => arr.map((r) => (r.id === id ? updated : r)));
        setMyItems((arr) => arr.map((r) => (r.id === id ? updated : r)));
        return { ok: true };
      } catch (err: any) {
        const msg = msgFromErr(err);
        setErrorKey("approve", msg);
        return { ok: false, error: msg };
      } finally {
        setLoadingKey("approve", false);
      }
    },
    [setErrorKey, setLoadingKey],
  );

  const cancelReservation = useCallback(
    async (id: string): Promise<OpResult> => {
      setErrorKey("cancel", undefined);
      setLoadingKey("cancel", true);
      try {
        const updated = await ReservationsAPI.cancel(id);
        cacheRef.current.set(updated.id, updated);
        setMyItems((arr) => arr.map((r) => (r.id === id ? updated : r)));
        setItems((arr) => arr.map((r) => (r.id === id ? updated : r)));
        setPendingItems((arr) => arr.filter((r) => r.id !== id));
        return { ok: true };
      } catch (err: any) {
        const msg = msgFromErr(err);
        setErrorKey("cancel", msg);
        return { ok: false, error: msg };
      } finally {
        setLoadingKey("cancel", false);
      }
    },
    [setErrorKey, setLoadingKey],
  );

  const completeReservation = useCallback(
    async (id: string): Promise<OpResult> => {
      setErrorKey("complete", undefined);
      setLoadingKey("complete", true);
      try {
        const updated = await ReservationsAPI.complete(id);
        cacheRef.current.set(updated.id, updated);
        setMyItems((arr) => arr.map((r) => (r.id === id ? updated : r)));
        setItems((arr) => arr.map((r) => (r.id === id ? updated : r)));
        setPendingItems((arr) => arr.filter((r) => r.id !== id));
        return { ok: true };
      } catch (err: any) {
        const msg = msgFromErr(err);
        setErrorKey("complete", msg);
        return { ok: false, error: msg };
      } finally {
        setLoadingKey("complete", false);
      }
    },
    [setErrorKey, setLoadingKey],
  );

  const removeReservation = useCallback(
    async (id: string): Promise<OpResult> => {
      setErrorKey("remove", undefined);
      setLoadingKey("remove", true);
      try {
        await ReservationsAPI.remove(id);
        cacheRef.current.delete(id);
        setMyItems((arr) => arr.filter((r) => r.id !== id));
        setItems((arr) => arr.filter((r) => r.id !== id));
        setPendingItems((arr) => arr.filter((r) => r.id !== id));
        return { ok: true };
      } catch (err: any) {
        const msg = msgFromErr(err);
        setErrorKey("remove", msg);
        return { ok: false, error: msg };
      } finally {
        setLoadingKey("remove", false);
      }
    },
    [setErrorKey, setLoadingKey],
  );

  const getReservation = useCallback(
    async (id: string) => {
      setErrorKey("get", undefined);
      setLoadingKey("get", true);
      try {
        const data = await ReservationsAPI.get(id);
        cacheRef.current.set(data.id, data);
        return data;
      } catch (err: any) {
        const msg = msgFromErr(err);
        setErrorKey("get", msg);
        throw err;
      } finally {
        setLoadingKey("get", false);
      }
    },
    [setErrorKey, setLoadingKey],
  );

  const listAvailableCars = useCallback(
    async (opts?: { branchId?: string }) => {
      const { branchId } = opts ?? {};
      const rows = await CarsAPI.list({
        status: "AVAILABLE" as any,
        ...(branchId ? { branchId } : {}),
      });
      return rows.map((c) => ({
        id: c.id,
        plate: c.plate,
        model: c.model,
      })) as Pick<Car, "id" | "plate" | "model">[];
    },
    [],
  );

  const value = useMemo(
    () => ({
      myItems,
      pendingItems,
      items,
      loading,
      errors,
      refreshMy,
      refreshPending,
      refresh,
      createReservation,
      approveReservation,
      cancelReservation,
      completeReservation,
      removeReservation,
      getReservation,
      listAvailableCars,
    }),
    [
      myItems,
      pendingItems,
      items,
      loading,
      errors,
      refreshMy,
      refreshPending,
      refresh,
      createReservation,
      approveReservation,
      cancelReservation,
      completeReservation,
      removeReservation,
      getReservation,
      listAvailableCars,
    ],
  );

  return value;
}
