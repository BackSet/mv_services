import { useEffect, useState } from 'react';
import { getPaquete, listPaquetes, type Paquete } from '@/services/paquetes.service';

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return 'Error';
}

export function usePaquetesList() {
  const [data, setData] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listPaquetes();
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

export function usePaquete(id?: string) {
  const [data, setData] = useState<Paquete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getPaquete(id);
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

