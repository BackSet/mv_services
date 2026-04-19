import api from './api';

export type Paquete = {
  id: number;
  numeroGuia: string;
  contenido?: string;
  destinatario?: string | null;
  ref?: string | null;
  /** Único peso real almacenado en el sistema. */
  pesoLbs?: number;
  /** Peso en kilogramos derivado por el backend (sólo lectura). */
  pesoKgs?: number;
  /** Posición del paquete dentro de su consolidado (1-based). Calculada por el backend. */
  posicionEnConsolidado?: number | null;
  shipper?: { id: number; nombre: string; nombreEncargado?: string | null };
  consolidado?: { id: number; numeroGuia?: string | null; estado?: string | null } | null;
  fechaRegistro?: string | null;
};

export type PaqueteRegistroMinimoInput = {
  numeroGuia: string;
  /** Único peso aceptado por el cliente. */
  pesoLbs?: number;
  contenido: string;
  destinatario: string;
  ref?: string;
  shipperId?: number;
};

export type PaqueteUpdateInput = {
  numeroGuia?: string;
  contenido?: string | null;
  destinatario?: string | null;
  ref?: string | null;
  /** Único peso aceptado por el cliente. */
  pesoLbs?: number;
  shipper?: { id: number } | null;
};

export async function listPaquetes(): Promise<Paquete[]> {
  const res = await api.get('/paquetes');
  return res.data;
}

export async function getPaquete(id: string | number): Promise<Paquete> {
  const res = await api.get(`/paquetes/${id}`);
  return res.data;
}

/** Busca un paquete por número de guía (para operario: escanear/teclear e imprimir etiqueta). Devuelve null si no existe. */
export async function getPaqueteByNumeroGuia(numeroGuia: string): Promise<Paquete | null> {
  const trimmed = numeroGuia?.trim();
  if (!trimmed) return null;
  try {
    const res = await api.get<Paquete>('/paquetes/by-guia', { params: { numeroGuia: trimmed } });
    return res.data;
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'response' in e) {
      const ax = e as { response?: { status?: number } };
      if (ax.response?.status === 404) return null;
    }
    throw e;
  }
}

export async function createPaqueteRegistroMinimo(input: PaqueteRegistroMinimoInput): Promise<Paquete> {
  const res = await api.post('/paquetes/registro-minimo', input);
  return res.data;
}

export async function updatePaquete(id: string | number, input: PaqueteUpdateInput): Promise<Paquete> {
  const res = await api.put(`/paquetes/${id}`, input);
  return res.data;
}

export async function createPaqueteSoloGuia(numeroGuia: string): Promise<Paquete> {
  const res = await api.post('/paquetes', { numeroGuia });
  return res.data;
}

export async function deletePaquete(id: string | number): Promise<void> {
  await api.delete(`/paquetes/${id}`);
}

