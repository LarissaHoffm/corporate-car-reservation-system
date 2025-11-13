import * as React from "react";
import {
  CarsAPI,
  Car,
  CarStatus,
  CreateCarDto,
  UpdateCarDto,
} from "@/lib/http/cars";

export type { Car, CarStatus, CreateCarDto, UpdateCarDto };

export function useCars(initial?: { status?: CarStatus; branchId?: string }) {
  const [data, setData] = React.useState<Car[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const refresh = React.useCallback(
    async (params?: { status?: CarStatus; branchId?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const list = await CarsAPI.list(params ?? initial);
        setData(list);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [initial?.status, initial?.branchId],
  );

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh, setData };
}

export function useCar(id?: string) {
  const [data, setData] = React.useState<Car | null>(null);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const item = await CarsAPI.get(id);
      setData(item);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh, setData };
}

export function useCarMutations() {
  const create = React.useCallback(
    async (body: CreateCarDto) => CarsAPI.create(body),
    [],
  );
  const update = React.useCallback(
    async (id: string, body: UpdateCarDto) => CarsAPI.update(id, body),
    [],
  );
  const remove = React.useCallback(
    async (id: string) => CarsAPI.remove(id),
    [],
  );
  return { create, update, remove };
}
