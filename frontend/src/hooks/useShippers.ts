import { useEffect, useState } from 'react';
import { getShipper, listShippers, type Shipper } from '@/services/shippers.service';

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return 'Error';
}

export function useShippersList() {
  const [data, setData] = useState<Shipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listShippers();
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

export function useShipper(id?: string) {
  const [data, setData] = useState<Shipper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getShipper(id);
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

