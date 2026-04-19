import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useMe } from '@/hooks/useMe';
import {
  getCountPendientes,
  listSolicitudes,
  type ShipperSolicitud,
} from '@/services/shipperSolicitudes.service';

const PERMISO_APROBAR = 'shippers.aprobar';
const REFRESH_MS = 30_000;

export function useSolicitudesPendientes(opts?: { withList?: boolean; notify?: boolean }) {
  const { me } = useMe();
  const enabled = Boolean(me?.permisos?.includes(PERMISO_APROBAR));
  const withList = Boolean(opts?.withList);
  const notify = opts?.notify ?? false;

  const countQuery = useQuery({
    queryKey: ['shipper-solicitudes', 'count', 'PENDIENTE'],
    queryFn: getCountPendientes,
    enabled,
    refetchInterval: enabled ? REFRESH_MS : false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const listQuery = useQuery({
    queryKey: ['shipper-solicitudes', 'list', 'PENDIENTE'],
    queryFn: () => listSolicitudes('PENDIENTE'),
    enabled: enabled && withList,
    refetchInterval: enabled && withList ? REFRESH_MS : false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  // Toast cuando llegan solicitudes nuevas (compara contador previo vs actual).
  const lastCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!notify || !enabled) return;
    const current = countQuery.data?.count ?? null;
    if (current == null) return;
    const prev = lastCountRef.current;
    if (prev != null && current > prev) {
      const diff = current - prev;
      toast.message(
        diff === 1 ? 'Nueva solicitud de shipper' : `${diff} nuevas solicitudes de shippers`,
        { description: 'Revísala en /solicitudes-shippers' },
      );
    }
    lastCountRef.current = current;
  }, [countQuery.data?.count, notify, enabled]);

  return {
    enabled,
    count: countQuery.data?.count ?? 0,
    countLoading: countQuery.isLoading,
    list: (listQuery.data ?? []) as ShipperSolicitud[],
    listLoading: listQuery.isLoading,
    refetch: async () => {
      await Promise.all([countQuery.refetch(), withList ? listQuery.refetch() : Promise.resolve()]);
    },
  };
}

/** Helper para invalidar todas las queries del módulo después de aprobar/rechazar. */
export function useInvalidateSolicitudes() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['shipper-solicitudes'] });
}
