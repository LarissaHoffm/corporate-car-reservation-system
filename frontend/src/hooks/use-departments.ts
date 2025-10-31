import { useEffect, useState } from 'react';
import { api } from '@/lib/http/api';

export type Department = { id: string; name: string; code: string };

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/departments');
        if (alive) setDepartments(data);
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.message ?? 'Erro ao carregar departamentos');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { departments, loading, error };
}
