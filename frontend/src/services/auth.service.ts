import { AxiosError } from 'axios';
import api from './api';

export type Me = {
  username: string;
  email?: string | null;
  rol: string | null;
  permisos: string[];
  shipperId: number | null;
  shipperNombre?: string | null;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type LoginResult = {
  token: string;
};

export type RegisterShipperPayload = {
  username: string;
  email: string;
  password: string;
  shipperNombre: string;
  codigoInterno?: string | null;
  nombreEncargado?: string | null;
};

export type ApiErrorPayload = {
  message?: string;
  code?: string;
  motivo?: string;
  status?: number;
  error?: string;
  path?: string;
  timestamp?: string;
};

export function normalizeMe(raw: unknown): Me {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    username: typeof data.username === 'string' ? data.username : '',
    email: typeof data.email === 'string' ? data.email : null,
    rol: typeof data.rol === 'string' ? data.rol : null,
    permisos: Array.isArray(data.permisos)
      ? data.permisos.filter((p): p is string => typeof p === 'string')
      : [],
    shipperId: typeof data.shipperId === 'number' ? data.shipperId : null,
    shipperNombre: typeof data.shipperNombre === 'string' ? data.shipperNombre : null,
  };
}

export async function getMe(): Promise<Me> {
  const res = await api.get('/auth/me');
  return normalizeMe(res.data);
}

export async function login(input: LoginPayload): Promise<LoginResult> {
  const res = await api.post('/auth/login', input);
  return res.data as LoginResult;
}

export async function registerShipper(input: RegisterShipperPayload): Promise<void> {
  await api.post('/auth/register-shipper', input);
}

export function getApiErrorPayload(error: unknown): ApiErrorPayload | null {
  const axiosErr = error as AxiosError<ApiErrorPayload | string>;
  const data = axiosErr.response?.data;
  if (!data) return null;
  if (typeof data === 'string') return { message: data };
  return data;
}

export function extractApiMessage(error: unknown, fallback: string): string {
  const payload = getApiErrorPayload(error);
  return payload?.message || fallback;
}

