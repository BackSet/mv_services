import { useEffect, useState } from 'react';
import { getRol, listRoles, type Rol } from '@/services/roles.service';

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return 'Error';
}

export function useRolesList() {
  const [data, setData] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listRoles();
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

export function useRol(id?: string) {
  const [data, setData] = useState<Rol | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getRol(id);
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

