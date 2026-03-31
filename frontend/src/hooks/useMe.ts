import { useEffect, useState } from 'react';
import api from '@/services/api';

export type Me = {
  username: string;
  email?: string | null;
  rol: string | null;
  permisos: string[];
  shipperId: number | null;
  shipperNombre?: string | null;
};

let cachedMe: Me | null = null;
let inflight: Promise<Me> | null = null;

async function fetchMe(): Promise<Me> {
  if (cachedMe) return cachedMe;
  if (inflight) return inflight;
  inflight = api
    .get('/auth/me')
    .then((res) => res.data as Me)
    .then((me) => {
      cachedMe = me;
      return me;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function clearMeCache() {
  cachedMe = null;
  inflight = null;
}

export function useMe() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [me, setMe] = useState<Me | null>(() => (token ? cachedMe : null));
  const [loading, setLoading] = useState<boolean>(() => Boolean(token) && !cachedMe);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (cachedMe) return;

    let mounted = true;
    fetchMe()
      .then((m) => {
        if (!mounted) return;
        setMe(m);
        setError(null);
      })
      .catch((e) => {
        if (!mounted) return;
        console.error('Error cargando /auth/me', e);
        setError('No se pudo cargar el perfil');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  return { me, loading, error };
}

