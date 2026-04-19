import api from './api';

export type EstadoSolicitudShipper = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export type ShipperSolicitud = {
  id: number;
  username: string;
  email: string;
  shipperNombre: string;
  codigoInterno?: string | null;
  nombreEncargado?: string | null;
  estado: EstadoSolicitudShipper;
  motivoRechazo?: string | null;
  fechaSolicitud?: string | null;
  fechaResolucion?: string | null;
  resueltaPorUsuarioId?: number | null;
  shipperCreadoId?: number | null;
  usuarioCreadoId?: number | null;
};

export type SolicitudCount = { estado: EstadoSolicitudShipper; count: number };

export async function listSolicitudes(estado: EstadoSolicitudShipper | 'ALL' = 'PENDIENTE'): Promise<ShipperSolicitud[]> {
  const res = await api.get('/shipper-solicitudes', { params: { estado } });
  return res.data;
}

export async function getSolicitud(id: number | string): Promise<ShipperSolicitud> {
  const res = await api.get(`/shipper-solicitudes/${id}`);
  return res.data;
}

export async function getCountPendientes(): Promise<SolicitudCount> {
  const res = await api.get('/shipper-solicitudes/count', { params: { estado: 'PENDIENTE' } });
  return res.data;
}

export async function aprobarSolicitud(id: number | string): Promise<ShipperSolicitud> {
  const res = await api.post(`/shipper-solicitudes/${id}/aprobar`);
  return res.data;
}

export async function rechazarSolicitud(id: number | string, motivo: string): Promise<ShipperSolicitud> {
  const res = await api.post(`/shipper-solicitudes/${id}/rechazar`, { motivo });
  return res.data;
}
