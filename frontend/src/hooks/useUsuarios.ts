import { useEffect, useState } from 'react';
import { getUsuario, listUsuarios, type Usuario } from '@/services/usuarios.service';

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return 'Error';
}

export function useUsuariosList() {
  const [data, setData] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listUsuarios();
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

export function useUsuario(id?: string) {
  const [data, setData] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getUsuario(id);
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

