import { useEffect, useState } from 'react';
import { getConsolidado, listConsolidados, type Consolidado } from '@/services/consolidados.service';

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return 'Error';
}

export function useConsolidadosList() {
  const [data, setData] = useState<Consolidado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listConsolidados();
      setData(rows);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { data, loading, error, refresh };
}

export function useConsolidado(id?: string) {
  const [data, setData] = useState<Consolidado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getConsolidado(id);
        setData(row);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return { data, loading, error };
}

