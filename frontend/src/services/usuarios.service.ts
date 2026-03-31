import api from './api';
import type { Rol } from './roles.service';
import type { Shipper } from './shippers.service';

export type Usuario = {
  id: number;
  username: string;
  email: string;
  rol?: Rol;
  shipper?: Shipper | null;
  activo: boolean;
};

export type UsuarioCreateInput = {
  username: string;
  email: string;
  password: string;
  rol?: Rol;
  shipper?: { id: number } | null;
  activo: boolean;
};

export type UsuarioUpdateInput = {
  username?: string;
  email?: string;
  password?: string;
  rol?: Rol;
  shipper?: { id: number } | null;
  activo?: boolean;
};

export async function listUsuarios(): Promise<Usuario[]> {
  const res = await api.get('/usuarios');
  return res.data;
}

export async function getUsuario(id: string | number): Promise<Usuario> {
  const res = await api.get(`/usuarios/${id}`);
  return res.data;
}

export async function createUsuario(input: UsuarioCreateInput): Promise<Usuario> {
  const res = await api.post('/usuarios', input);
  return res.data;
}

export async function updateUsuario(id: string | number, input: UsuarioUpdateInput): Promise<Usuario> {
  const res = await api.put(`/usuarios/${id}`, input);
  return res.data;
}

export async function deleteUsuario(id: string | number): Promise<void> {
  await api.delete(`/usuarios/${id}`);
}

export async function getUsuarioByShipperId(shipperId: number): Promise<Usuario | null> {
  try {
    const res = await api.get(`/usuarios/by-shipper/${shipperId}`);
    return res.data;
  } catch {
    return null;
  }
}
