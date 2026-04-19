import api from './api';

export type Telefono = {
  id?: number;
  numero: string;
  etiqueta?: string | null;
  esPrincipal?: boolean;
};

export type DireccionShipper = {
  id?: number;
  pais?: string | null;
  ciudad?: string | null;
  canton?: string | null;
  direccion?: string | null;
  referencia?: string | null;
};

export type Shipper = {
  id: number;
  nombre: string;
  codigoInterno?: string | null;
  nombreEncargado?: string | null;
  telefonos?: Telefono[];
  direcciones?: DireccionShipper[];
};

export type ShipperCreateInput = {
  nombre: string;
  codigoInterno?: string | null;
  nombreEncargado?: string | null;
};

export type ShipperUpdateInput = ShipperCreateInput;

type RawRecord = Record<string, unknown>;

function asRecord(raw: unknown): RawRecord {
  return (raw && typeof raw === 'object' ? (raw as RawRecord) : {});
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function normalizeTelefono(raw: unknown): Telefono {
  const r = asRecord(raw);
  return {
    id: typeof r.id === 'number' ? r.id : undefined,
    numero: asString(r.numero) ?? '',
    etiqueta: asString(r.etiqueta) ?? null,
    esPrincipal: Boolean(r.esPrincipal ?? r.es_principal ?? false),
  };
}

function normalizeDireccion(raw: unknown): DireccionShipper {
  const r = asRecord(raw);
  return {
    id: typeof r.id === 'number' ? r.id : undefined,
    pais: asString(r.pais) ?? null,
    ciudad: asString(r.ciudad) ?? null,
    canton: asString(r.canton) ?? null,
    direccion: asString(r.direccion) ?? null,
    referencia: asString(r.referencia) ?? null,
  };
}

function normalizeShipper(raw: unknown): Shipper {
  const r = asRecord(raw);
  const telefonos = Array.isArray(r.telefonos) ? r.telefonos : [];
  const direcciones = Array.isArray(r.direcciones) ? r.direcciones : [];
  return {
    id: Number(r.id),
    nombre: asString(r.nombre) ?? '',
    codigoInterno: asString(r.codigoInterno) ?? asString(r.codigo_interno) ?? null,
    nombreEncargado: asString(r.nombreEncargado) ?? asString(r.nombre_encargado) ?? null,
    telefonos: telefonos.map(normalizeTelefono),
    direcciones: direcciones.map(normalizeDireccion),
  };
}

export async function listShippers(): Promise<Shipper[]> {
  const res = await api.get('/shippers');
  const rows = Array.isArray(res.data) ? res.data : [];
  return rows.map(normalizeShipper);
}

export async function getShipper(id: string | number): Promise<Shipper> {
  const res = await api.get(`/shippers/${id}`);
  return normalizeShipper(res.data);
}

export async function createShipper(input: ShipperCreateInput): Promise<Shipper> {
  const res = await api.post('/shippers', input);
  return normalizeShipper(res.data);
}

export async function updateShipper(id: string | number, input: ShipperUpdateInput): Promise<Shipper> {
  const res = await api.put(`/shippers/${id}`, input);
  return normalizeShipper(res.data);
}

export async function deleteShipper(id: string | number): Promise<void> {
  await api.delete(`/shippers/${id}`);
}

export async function addShipperTelefono(shipperId: string | number, input: { numero: string; etiqueta?: string | null; esPrincipal?: boolean }): Promise<Telefono> {
  const res = await api.post(`/shippers/${shipperId}/telefonos`, input);
  return normalizeTelefono(res.data);
}

export async function updateShipperTelefono(
  shipperId: string | number,
  telefonoId: string | number,
  input: { numero?: string; etiqueta?: string | null; esPrincipal?: boolean }
): Promise<Telefono> {
  const res = await api.put(`/shippers/${shipperId}/telefonos/${telefonoId}`, input);
  return normalizeTelefono(res.data);
}

export async function deleteShipperTelefono(shipperId: string | number, telefonoId: string | number): Promise<void> {
  await api.delete(`/shippers/${shipperId}/telefonos/${telefonoId}`);
}

export async function deleteShipperDireccion(shipperId: string | number, direccionId: string | number): Promise<void> {
  await api.delete(`/shippers/${shipperId}/direcciones/${direccionId}`);
}

export async function addShipperDireccion(
  shipperId: string | number,
  input: {
    pais?: string | null;
    ciudad?: string | null;
    canton?: string | null;
    direccion?: string | null;
    referencia?: string | null;
  }
): Promise<DireccionShipper> {
  const res = await api.post(`/shippers/${shipperId}/direcciones`, input);
  return normalizeDireccion(res.data);
}

export async function updateShipperDireccion(
  shipperId: string | number,
  direccionId: string | number,
  input: {
    pais?: string | null;
    ciudad?: string | null;
    canton?: string | null;
    direccion?: string | null;
    referencia?: string | null;
  }
): Promise<DireccionShipper> {
  const res = await api.put(`/shippers/${shipperId}/direcciones/${direccionId}`, input);
  return normalizeDireccion(res.data);
}

