import { useEffect, useState } from 'react';
import { getMe, type Me } from '@/services/auth.service';

let cachedMe: Me | null = null;
let inflight: Promise<Me> | null = null;

async function fetchMe(): Promise<Me> {
  if (cachedMe) return cachedMe;
  if (inflight) return inflight;
  inflight = getMe()
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

export function setMeCache(me: Me) {
  cachedMe = me;
  meListeners.forEach((fn) => {
    try { fn(me); } catch { /* noop */ }
  });
}

const meListeners = new Set<(me: Me) => void>();

export function useMe() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [me, setMe] = useState<Me | null>(() => (token ? cachedMe : null));
  const [loading, setLoading] = useState<boolean>(() => Boolean(token) && !cachedMe);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const onUpdate = (m: Me) => setMe(m);
    meListeners.add(onUpdate);

    if (cachedMe) {
      return () => {
        meListeners.delete(onUpdate);
      };
    }

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
      meListeners.delete(onUpdate);
    };
  }, [token]);

  return { me, loading, error };
}

